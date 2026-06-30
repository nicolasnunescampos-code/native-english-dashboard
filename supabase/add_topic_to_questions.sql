-- Add a topic column to the questions table to group them within a single exam
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'General';
