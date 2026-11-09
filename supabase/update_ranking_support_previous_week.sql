-- ============================================================
-- Migration: Add Support for Previous Week / Custom Date Range to Ranking
-- Replaces public.get_grammar_rush_leaderboard so that it supports
-- an optional p_week_end parameter, enabling filtering by previous week
-- or any arbitrary date window.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_grammar_rush_leaderboard(TEXT, TEXT, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS public.get_grammar_rush_leaderboard(TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

CREATE OR REPLACE FUNCTION public.get_grammar_rush_leaderboard(
    p_book TEXT DEFAULT 'Beginner',
    p_chapter TEXT DEFAULT NULL,
    p_week_start TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('week', timezone('utc'::text, now())),
    p_week_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    rank BIGINT,
    first_name TEXT,
    score INT,
    accuracy NUMERIC,
    best_combo INT,
    games_played BIGINT,
    is_current_user BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    WITH filtered_sessions AS (
        SELECT
            gs.student_id,
            gs.score,
            gs.accuracy,
            gs.best_combo,
            gs.created_at
        FROM public.grammar_game_sessions gs
        WHERE (p_book IS NULL OR p_book = 'ALL' OR gs.book = p_book)
          AND (p_chapter IS NULL OR p_chapter = 'all' OR gs.chapter = p_chapter)
          AND (p_week_start IS NULL OR gs.created_at >= p_week_start)
          AND (p_week_end IS NULL OR gs.created_at <= p_week_end)
    ),
    aggregated AS (
        SELECT
            fs.student_id,
            SUM(fs.score)::INT AS total_score,
            MAX(fs.score)::INT AS best_score,
            ROUND(AVG(fs.accuracy), 1) AS avg_accuracy,
            MAX(fs.best_combo)::INT AS max_combo,
            COUNT(*)::BIGINT AS total_games
        FROM filtered_sessions fs
        GROUP BY fs.student_id
    ),
    named AS (
        SELECT
            a.student_id,
            COALESCE(
                NULLIF(TRIM(s.student_name), ''),
                'Student'
            ) AS first_name,
            a.total_score,
            a.best_score,
            a.avg_accuracy,
            a.max_combo,
            a.total_games
        FROM aggregated a
        LEFT JOIN public.students s ON s.id = a.student_id
    )
    SELECT
        RANK() OVER (ORDER BY n.total_score DESC, n.best_score DESC, n.avg_accuracy DESC, n.max_combo DESC) AS rank,
        n.first_name,
        n.total_score AS score,
        n.avg_accuracy AS accuracy,
        n.max_combo AS best_combo,
        n.total_games AS games_played,
        (n.student_id = auth.uid()) AS is_current_user
    FROM named n
    ORDER BY rank ASC, n.first_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_grammar_rush_leaderboard(TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated, anon;
