-- Add teacher_id to classes table
ALTER TABLE public.classes
ADD COLUMN teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL;

-- If necessary, also update schema cache by doing:
NOTIFY pgrst, 'reload schema';
