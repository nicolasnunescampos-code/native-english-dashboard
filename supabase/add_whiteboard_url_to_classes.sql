-- Add whiteboard_url column to classes table for Grammar class whiteboard screenshots
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS whiteboard_url TEXT;
