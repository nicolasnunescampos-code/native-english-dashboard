-- Optional: add avatar_url to students and teachers so avatars can also be displayed across shared directories
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
