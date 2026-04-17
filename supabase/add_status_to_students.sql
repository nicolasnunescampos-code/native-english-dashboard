ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
