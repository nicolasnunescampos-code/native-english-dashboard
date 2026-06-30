-- Fix for empty dropdowns: Disabling RLS for the new exam tables so they can be read.
-- Run this in your Supabase SQL Editor

ALTER TABLE public.exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_submissions DISABLE ROW LEVEL SECURITY;
