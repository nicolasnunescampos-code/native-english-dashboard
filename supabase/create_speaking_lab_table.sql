-- Table to store automated student speaking practice attempts & scores
CREATE TABLE IF NOT EXISTS public.student_speaking_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT,
    student_name TEXT NOT NULL,
    book_id TEXT NOT NULL,
    book_title TEXT NOT NULL,
    chapter_number INT NOT NULL,
    chapter_title TEXT NOT NULL,
    sentence_id TEXT,
    sentence_text TEXT NOT NULL,
    spoken_text TEXT NOT NULL,
    score INT NOT NULL, -- 0 to 100
    stars INT NOT NULL DEFAULT 1, -- 1, 2, or 3
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for speedy queries by student and chapter
CREATE INDEX IF NOT EXISTS idx_speaking_student_id ON public.student_speaking_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_speaking_created_at ON public.student_speaking_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_speaking_chapter ON public.student_speaking_attempts(book_id, chapter_number);

-- Row Level Security
ALTER TABLE public.student_speaking_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON public.student_speaking_attempts FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.student_speaking_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.student_speaking_attempts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all" ON public.student_speaking_attempts FOR DELETE USING (true);
