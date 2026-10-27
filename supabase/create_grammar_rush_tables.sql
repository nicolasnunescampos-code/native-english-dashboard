-- Migration script: create_grammar_rush_tables.sql
-- Creates tables, RLS policies, and privacy-safe leaderboard RPC/view for Grammar Rush

-- ============================================================
-- 1. HELPER FUNCTION FOR ROLE DETECTION (Supports JWT app_metadata + table fallbacks)
-- ============================================================
CREATE OR REPLACE FUNCTION public.grammar_rush_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT;
  user_email TEXT;
BEGIN
  jwt_role := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', ''));
  IF jwt_role IN ('admin', 'teacher', 'student') THEN
    RETURN jwt_role;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN 'anonymous';
  END IF;

  -- Check teachers table
  IF EXISTS (SELECT 1 FROM public.teachers WHERE id = auth.uid()) THEN
    RETURN 'teacher';
  END IF;

  -- Check students table by id or email
  user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF EXISTS (
    SELECT 1 FROM public.students
    WHERE id = auth.uid() OR (user_email <> '' AND lower(email) = user_email)
  ) THEN
    RETURN 'student';
  END IF;

  RETURN 'authenticated';
END;
$$;

-- ============================================================
-- 2. TABLE: grammar_game_questions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.grammar_game_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book TEXT NOT NULL CHECK (book IN ('Beginner', 'Intermediate', 'Advanced')),
    chapter TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('true_false_fix', 'fill_gap', 'word_order')),
    sentence TEXT NOT NULL,
    correct_sentence TEXT NOT NULL,
    error_word_index INT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_option TEXT NOT NULL DEFAULT '',
    explanation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_grammar_questions_book_chapter_status
    ON public.grammar_game_questions(book, chapter, status);
CREATE INDEX IF NOT EXISTS idx_grammar_questions_type
    ON public.grammar_game_questions(type);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_grammar_game_questions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grammar_game_questions_updated_at ON public.grammar_game_questions;
CREATE TRIGGER trg_grammar_game_questions_updated_at
    BEFORE UPDATE ON public.grammar_game_questions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_grammar_game_questions_updated_at();

-- ============================================================
-- 3. TABLE: grammar_game_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.grammar_game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    book TEXT NOT NULL CHECK (book IN ('Beginner', 'Intermediate', 'Advanced')),
    chapter TEXT NOT NULL,
    score INT NOT NULL DEFAULT 0,
    accuracy NUMERIC(5, 2) NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    total_count INT NOT NULL DEFAULT 0,
    best_combo INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 0,
    mistakes JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_grammar_sessions_student_id
    ON public.grammar_game_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_grammar_sessions_book_chapter
    ON public.grammar_game_sessions(book, chapter);
CREATE INDEX IF NOT EXISTS idx_grammar_sessions_created_at
    ON public.grammar_game_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grammar_sessions_score
    ON public.grammar_game_sessions(book, score DESC);

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.grammar_game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_game_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running migration
DROP POLICY IF EXISTS "Students can view approved grammar questions" ON public.grammar_game_questions;
DROP POLICY IF EXISTS "Teachers can view all grammar questions" ON public.grammar_game_questions;
DROP POLICY IF EXISTS "Teachers can insert grammar questions" ON public.grammar_game_questions;
DROP POLICY IF EXISTS "Teachers can update grammar questions" ON public.grammar_game_questions;
DROP POLICY IF EXISTS "Admins have full access to grammar questions" ON public.grammar_game_questions;

DROP POLICY IF EXISTS "Students can view own grammar sessions" ON public.grammar_game_sessions;
DROP POLICY IF EXISTS "Students can insert own grammar sessions" ON public.grammar_game_sessions;
DROP POLICY IF EXISTS "Teachers can view student grammar sessions" ON public.grammar_game_sessions;
DROP POLICY IF EXISTS "Admins have full access to grammar sessions" ON public.grammar_game_sessions;

-- Questions Policies:
-- 1) Students: SELECT only approved questions
CREATE POLICY "Students can view approved grammar questions"
    ON public.grammar_game_questions
    FOR SELECT
    USING (status = 'approved');

-- 2) Teachers: SELECT all questions (read-only for analytics/student review; only admins can create/edit/delete)
CREATE POLICY "Teachers can view all grammar questions"
    ON public.grammar_game_questions
    FOR SELECT
    USING (public.grammar_rush_user_role() IN ('teacher', 'admin'));

-- 3) Admins: Full access (INSERT, UPDATE, DELETE, SELECT)
CREATE POLICY "Admins have full access to grammar questions"
    ON public.grammar_game_questions
    FOR ALL
    USING (public.grammar_rush_user_role() = 'admin')
    WITH CHECK (public.grammar_rush_user_role() = 'admin');

-- Sessions Policies:
-- 1) Students: SELECT and INSERT only their own sessions
CREATE POLICY "Students can view own grammar sessions"
    ON public.grammar_game_sessions
    FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own grammar sessions"
    ON public.grammar_game_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- 2) Teachers: SELECT sessions of students (matches TeacherStudents directory & class assignments)
CREATE POLICY "Teachers can view student grammar sessions"
    ON public.grammar_game_sessions
    FOR SELECT
    USING (
        public.grammar_rush_user_role() IN ('teacher', 'admin')
        AND EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = grammar_game_sessions.student_id
        )
    );

-- 3) Admins: Full access
CREATE POLICY "Admins have full access to grammar sessions"
    ON public.grammar_game_sessions
    FOR ALL
    USING (public.grammar_rush_user_role() = 'admin')
    WITH CHECK (public.grammar_rush_user_role() = 'admin');

-- ============================================================
-- 5. PRIVACY-SAFE LEADERBOARD VIEW & RPC FUNCTION
-- Returns ONLY first_name, score, rank, accuracy, best_combo, games_played, and is_current_user.
-- Never exposes emails, full names, or other personal data.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_grammar_rush_leaderboard(
    p_book TEXT DEFAULT 'Beginner',
    p_chapter TEXT DEFAULT NULL,
    p_week_start TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('week', timezone('utc'::text, now()))
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
        WHERE gs.book = p_book
          AND (p_chapter IS NULL OR p_chapter = 'all' OR gs.chapter = p_chapter)
          AND (p_week_start IS NULL OR gs.created_at >= p_week_start)
    ),
    aggregated AS (
        SELECT
            fs.student_id,
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
                NULLIF(SPLIT_PART(TRIM(s.student_name), ' ', 1), ''),
                'Student'
            ) AS first_name,
            a.best_score,
            a.avg_accuracy,
            a.max_combo,
            a.total_games
        FROM aggregated a
        LEFT JOIN public.students s ON s.id = a.student_id
    )
    SELECT
        RANK() OVER (ORDER BY n.best_score DESC, n.avg_accuracy DESC, n.max_combo DESC) AS rank,
        n.first_name,
        n.best_score AS score,
        n.avg_accuracy AS accuracy,
        n.max_combo AS best_combo,
        n.total_games AS games_played,
        (n.student_id = auth.uid()) AS is_current_user
    FROM named n
    ORDER BY rank ASC, n.first_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_grammar_rush_leaderboard(TEXT, TEXT, TIMESTAMP WITH TIME ZONE) TO authenticated;
