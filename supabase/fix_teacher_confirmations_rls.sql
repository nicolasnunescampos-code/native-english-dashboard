-- ==============================================================================
-- FIX ROW LEVEL SECURITY (RLS) FOR TEACHER WEEKLY CONFIRMATIONS
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ibykhkbyzifddwnsfxxy/sql
-- ==============================================================================

-- Option 1: Completely disable RLS (recommended, same as disable_rls_exams.sql)
ALTER TABLE public.teacher_weekly_confirmations DISABLE ROW LEVEL SECURITY;

-- Option 2: If you prefer RLS enabled, run these permissive policies:
/*
ALTER TABLE public.teacher_weekly_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all" ON public.teacher_weekly_confirmations;
DROP POLICY IF EXISTS "Enable insert for all" ON public.teacher_weekly_confirmations;
DROP POLICY IF EXISTS "Enable update for all" ON public.teacher_weekly_confirmations;
DROP POLICY IF EXISTS "Enable delete for all" ON public.teacher_weekly_confirmations;

CREATE POLICY "Enable read for all" ON public.teacher_weekly_confirmations FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.teacher_weekly_confirmations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.teacher_weekly_confirmations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all" ON public.teacher_weekly_confirmations FOR DELETE USING (true);
*/
