-- Migration script: insert_consolidated_exams.sql
-- Run this in your Supabase SQL Editor AFTER running add_topic_to_questions.sql

-- Clear old individual exams and submissions to avoid clutter
DELETE FROM public.exam_submissions;
DELETE FROM public.questions;
DELETE FROM public.exams;

DO $$
DECLARE
    exam1_id UUID;
BEGIN
    -- ==========================================
    -- CONSOLIDATED EXAM 1
    -- ==========================================
    INSERT INTO public.exams (title, chapter_number, level)
    VALUES ('Beginner Exam 1 (Chapters 1 to 5)', 1, 'Beginner')
    RETURNING id INTO exam1_id;

    -- ==========================================
    -- ACTIVITY 1: Chapter 1: Verb To Be
    -- ==========================================
    INSERT INTO public.questions (exam_id, topic, question_text, type, correct_answer, points)
    VALUES 
        (exam1_id, 'Chapter 1: Verb To Be (Present Simple)', '(Positive) She ___ a very talented singer.', 'fill-in-the-blank', 'is', 20),
        (exam1_id, 'Chapter 1: Verb To Be (Present Simple)', '(Negative) We ___ at school today because it''s a holiday.', 'fill-in-the-blank', 'aren''t', 20),
        (exam1_id, 'Chapter 1: Verb To Be (Present Simple)', '(Interrogative) ___ you ready for the presentation?', 'fill-in-the-blank', 'Are', 20),
        (exam1_id, 'Chapter 1: Verb To Be (Present Simple)', '(Positive) I ___ a student at this English school.', 'fill-in-the-blank', 'am', 20),
        (exam1_id, 'Chapter 1: Verb To Be (Present Simple)', '(Negative) My dog ___ dangerous; he is very friendly.', 'fill-in-the-blank', 'isn''t', 20);

    -- ==========================================
    -- ACTIVITY 2: Chapter 2: There is & There are
    -- ==========================================
    INSERT INTO public.questions (exam_id, topic, question_text, type, correct_answer, points)
    VALUES 
        (exam1_id, 'Chapter 2: There is & There are', '(Positive) ___ a big park near my house.', 'fill-in-the-blank', 'There is', 20),
        (exam1_id, 'Chapter 2: There is & There are', '(Negative) ___ any eggs in the refrigerator.', 'fill-in-the-blank', 'There aren''t', 20),
        (exam1_id, 'Chapter 2: There is & There are', '(Interrogative) ___ any students in the classroom?', 'fill-in-the-blank', 'Are there', 20),
        (exam1_id, 'Chapter 2: There is & There are', '(Positive) ___ many cars on the street today.', 'fill-in-the-blank', 'There are', 20),
        (exam1_id, 'Chapter 2: There is & There are', '(Interrogative) ___ a bank on this street?', 'fill-in-the-blank', 'Is there', 20);

    -- ==========================================
    -- ACTIVITY 3: Chapter 3: Prepositions of Place
    -- ==========================================
    INSERT INTO public.questions (exam_id, topic, question_text, type, correct_answer, points)
    VALUES 
        (exam1_id, 'Chapter 3: Prepositions of Place', 'The keys are ___ the table. (Surface)', 'fill-in-the-blank', 'on', 20),
        (exam1_id, 'Chapter 3: Prepositions of Place', 'The bank is ___ the coffee shop and the pharmacy.', 'fill-in-the-blank', 'between', 20),
        (exam1_id, 'Chapter 3: Prepositions of Place', 'I sit ___ my best friend in class. (Beside)', 'fill-in-the-blank', 'next to', 20),
        (exam1_id, 'Chapter 3: Prepositions of Place', 'The car is parked ___ the house, so you can''t see it from the street.', 'fill-in-the-blank', 'behind', 20),
        (exam1_id, 'Chapter 3: Prepositions of Place', 'My laptop is ___ my backpack. (Inside)', 'fill-in-the-blank', 'in', 20);

    -- ==========================================
    -- ACTIVITY 4: Chapter 4: Demonstratives
    -- ==========================================
    INSERT INTO public.questions (exam_id, topic, question_text, type, correct_answer, points)
    VALUES 
        (exam1_id, 'Chapter 4: Demonstratives (This, That, These, Those)', '(Near/Singular) ___ is my favorite book here in my hand.', 'fill-in-the-blank', 'This', 20),
        (exam1_id, 'Chapter 4: Demonstratives (This, That, These, Those)', '(Far/Plural) Look at ___ stars in the sky!', 'fill-in-the-blank', 'those', 20),
        (exam1_id, 'Chapter 4: Demonstratives (This, That, These, Those)', '(Far/Singular) Who is ___ man standing over there by the door?', 'fill-in-the-blank', 'that', 20),
        (exam1_id, 'Chapter 4: Demonstratives (This, That, These, Those)', '(Near/Plural) ___ shoes I am wearing are very comfortable.', 'fill-in-the-blank', 'These', 20),
        (exam1_id, 'Chapter 4: Demonstratives (This, That, These, Those)', '(Negative/Far/Plural) ___ aren''t my cars; mine are in the garage.', 'fill-in-the-blank', 'Those', 20);

    -- ==========================================
    -- ACTIVITY 5: Chapter 5: Question Words
    -- ==========================================
    INSERT INTO public.questions (exam_id, topic, question_text, type, correct_answer, points)
    VALUES 
        (exam1_id, 'Chapter 5: Question Words', '___ is your birthday? (Asking about time)', 'fill-in-the-blank', 'When', 20),
        (exam1_id, 'Chapter 5: Question Words', '___ is your favorite color? (Asking about a thing)', 'fill-in-the-blank', 'What', 20),
        (exam1_id, 'Chapter 5: Question Words', '___ is the bathroom? (Asking about location)', 'fill-in-the-blank', 'Where', 20),
        (exam1_id, 'Chapter 5: Question Words', '___ are you crying? (Asking for a reason)', 'fill-in-the-blank', 'Why', 20),
        (exam1_id, 'Chapter 5: Question Words', '___ is that boy? (Asking about a person)', 'fill-in-the-blank', 'Who', 20);

END $$;
