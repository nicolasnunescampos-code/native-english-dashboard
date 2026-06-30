-- Migration script: insert_beginner_exams.sql
-- Run this in your Supabase SQL Editor

-- Use a DO block to easily declare variables and manage the IDs
DO $$
DECLARE
    exam1_id UUID;
    exam2_id UUID;
    exam3_id UUID;
    exam4_id UUID;
    exam5_id UUID;
BEGIN
    -- ==========================================
    -- EXAM 1: Chapter 1: Verb To Be
    -- ==========================================
    INSERT INTO public.exams (title, chapter_number, level)
    VALUES ('Verb To Be (Present Simple)', 1, 'Beginner')
    RETURNING id INTO exam1_id;

    INSERT INTO public.questions (exam_id, question_text, type, correct_answer, points)
    VALUES 
        (exam1_id, '(Positive) She ___ a very talented singer.', 'fill-in-the-blank', 'is', 20),
        (exam1_id, '(Negative) We ___ at school today because it''s a holiday.', 'fill-in-the-blank', 'aren''t', 20),
        (exam1_id, '(Interrogative) ___ you ready for the presentation?', 'fill-in-the-blank', 'Are', 20),
        (exam1_id, '(Positive) I ___ a student at this English school.', 'fill-in-the-blank', 'am', 20),
        (exam1_id, '(Negative) My dog ___ dangerous; he is very friendly.', 'fill-in-the-blank', 'isn''t', 20);

    -- ==========================================
    -- EXAM 2: Chapter 2: There is & There are
    -- ==========================================
    INSERT INTO public.exams (title, chapter_number, level)
    VALUES ('There is & There are', 2, 'Beginner')
    RETURNING id INTO exam2_id;

    INSERT INTO public.questions (exam_id, question_text, type, correct_answer, points)
    VALUES 
        (exam2_id, '(Positive) ___ a big park near my house.', 'fill-in-the-blank', 'There is', 20),
        (exam2_id, '(Negative) ___ any eggs in the refrigerator.', 'fill-in-the-blank', 'There aren''t', 20),
        (exam2_id, '(Interrogative) ___ any students in the classroom?', 'fill-in-the-blank', 'Are there', 20),
        (exam2_id, '(Positive) ___ many cars on the street today.', 'fill-in-the-blank', 'There are', 20),
        (exam2_id, '(Interrogative) ___ a bank on this street?', 'fill-in-the-blank', 'Is there', 20);

    -- ==========================================
    -- EXAM 3: Chapter 3: Prepositions of Place
    -- ==========================================
    INSERT INTO public.exams (title, chapter_number, level)
    VALUES ('Prepositions of Place', 3, 'Beginner')
    RETURNING id INTO exam3_id;

    INSERT INTO public.questions (exam_id, question_text, type, correct_answer, points)
    VALUES 
        (exam3_id, 'The keys are ___ the table. (Surface)', 'fill-in-the-blank', 'on', 20),
        (exam3_id, 'The bank is ___ the coffee shop and the pharmacy.', 'fill-in-the-blank', 'between', 20),
        (exam3_id, 'I sit ___ my best friend in class. (Beside)', 'fill-in-the-blank', 'next to', 20),
        (exam3_id, 'The car is parked ___ the house, so you can''t see it from the street.', 'fill-in-the-blank', 'behind', 20),
        (exam3_id, 'My laptop is ___ my backpack. (Inside)', 'fill-in-the-blank', 'in', 20);

    -- ==========================================
    -- EXAM 4: Chapter 4: Demonstratives
    -- ==========================================
    INSERT INTO public.exams (title, chapter_number, level)
    VALUES ('Demonstratives (This, That, These, Those)', 4, 'Beginner')
    RETURNING id INTO exam4_id;

    INSERT INTO public.questions (exam_id, question_text, type, correct_answer, points)
    VALUES 
        (exam4_id, '(Near/Singular) ___ is my favorite book here in my hand.', 'fill-in-the-blank', 'This', 20),
        (exam4_id, '(Far/Plural) Look at ___ stars in the sky!', 'fill-in-the-blank', 'those', 20),
        (exam4_id, '(Far/Singular) Who is ___ man standing over there by the door?', 'fill-in-the-blank', 'that', 20),
        (exam4_id, '(Near/Plural) ___ shoes I am wearing are very comfortable.', 'fill-in-the-blank', 'These', 20),
        (exam4_id, '(Negative/Far/Plural) ___ aren''t my cars; mine are in the garage.', 'fill-in-the-blank', 'Those', 20);

    -- ==========================================
    -- EXAM 5: Chapter 5: Question Words
    -- ==========================================
    INSERT INTO public.exams (title, chapter_number, level)
    VALUES ('Question Words', 5, 'Beginner')
    RETURNING id INTO exam5_id;

    INSERT INTO public.questions (exam_id, question_text, type, correct_answer, points)
    VALUES 
        (exam5_id, '___ is your birthday? (Asking about time)', 'fill-in-the-blank', 'When', 20),
        (exam5_id, '___ is your favorite color? (Asking about a thing)', 'fill-in-the-blank', 'What', 20),
        (exam5_id, '___ is the bathroom? (Asking about location)', 'fill-in-the-blank', 'Where', 20),
        (exam5_id, '___ are you crying? (Asking for a reason)', 'fill-in-the-blank', 'Why', 20),
        (exam5_id, '___ is that boy? (Asking about a person)', 'fill-in-the-blank', 'Who', 20);

END $$;
