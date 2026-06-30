-- Migration script: create_student_exams.sql
-- Run this in your Supabase SQL Editor

-- 1. Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    chapter_number INTEGER NOT NULL,
    level TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('fill-in-the-blank', 'multiple-choice')),
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Exam Submissions Table
-- This table tracks BOTH the unlocked status and the final submission.
-- When a teacher "unlocks" an exam, they insert a row here with a null score and null completed_at.
-- When the student finishes, they update this row.
CREATE TABLE IF NOT EXISTS public.exam_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    score NUMERIC, -- NULL means unlocked but not yet taken
    answers_json JSONB, -- Stores the student's submitted answers
    completed_at TIMESTAMP WITH TIME ZONE, -- NULL until the student submits the exam
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, exam_id) -- A student can only have one active/completed submission per exam
);

-- Note: Depending on whether 'students' are managed in `auth.users` or a separate `students` table, 
-- you might need to change `REFERENCES auth.users(id)` to `REFERENCES public.students(id)` 
-- based on your specific Supabase setup. Looking at `lib/supabase.ts`, students have `id: string`,
-- usually matching `auth.users.id`.
