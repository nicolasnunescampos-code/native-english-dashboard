-- Migration script: add_category_to_audios.sql
-- Adds the missing 'category' column to public.audios and ensures RLS policies allow admin management and student playback.

ALTER TABLE public.audios
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Beginner';

ALTER TABLE public.audios ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audios' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.audios FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audios' AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.audios FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audios' AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON public.audios FOR UPDATE USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audios' AND policyname = 'Enable delete for authenticated users'
    ) THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.audios FOR DELETE USING (true);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
