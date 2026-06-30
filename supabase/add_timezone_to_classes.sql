-- Add timezone column to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Sao_Paulo';
