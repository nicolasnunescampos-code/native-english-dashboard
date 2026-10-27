-- Seed script: seed_grammar_rush_beginner_ch1.sql
-- Inserts 18 approved questions for Beginner Grammar - Chapter 1 (Verb To Be)
-- Includes 6 'true_false_fix' (2 error-free, 4 with 1 error), 6 'fill_gap', and 6 'word_order' questions.

INSERT INTO public.grammar_game_questions (
    book,
    chapter,
    type,
    sentence,
    correct_sentence,
    error_word_index,
    options,
    correct_option,
    explanation,
    status
) VALUES
-- ============================================================
-- TYPE A: true_false_fix (6 questions)
-- ============================================================
(
    'Beginner',
    '1',
    'true_false_fix',
    'She are my favorite English teacher.',
    'She is my favorite English teacher.',
    1,
    '["is", "am", "be", "were"]'::jsonb,
    'is',
    'Use "is" with the singular pronoun "she", not "are".',
    'approved'
),
(
    'Beginner',
    '1',
    'true_false_fix',
    'We are ready for the English class today.',
    'We are ready for the English class today.',
    NULL,
    '[]'::jsonb,
    '',
    'This sentence is correct! "We" takes the plural verb "are".',
    'approved'
),
(
    'Beginner',
    '1',
    'true_false_fix',
    'I is very happy to meet you.',
    'I am very happy to meet you.',
    1,
    '["am", "are", "be", "being"]'::jsonb,
    'am',
    'Always use "am" with the pronoun "I" in the present simple.',
    'approved'
),
(
    'Beginner',
    '1',
    'true_false_fix',
    'They is from a small town in Canada.',
    'They are from a small town in Canada.',
    1,
    '["are", "am", "is", "be"]'::jsonb,
    'are',
    'Use "are" with the plural subject "they".',
    'approved'
),
(
    'Beginner',
    '1',
    'true_false_fix',
    'Are you at the office right now?',
    'Are you at the office right now?',
    NULL,
    '[]'::jsonb,
    '',
    'This question is correct! Invert "Are" and "you" for yes/no questions.',
    'approved'
),
(
    'Beginner',
    '1',
    'true_false_fix',
    'My brother am twenty years old.',
    'My brother is twenty years old.',
    2,
    '["is", "are", "be", "have"]'::jsonb,
    'is',
    '"My brother" (he) is third-person singular, so use "is".',
    'approved'
),

-- ============================================================
-- TYPE B: fill_gap (6 questions)
-- ============================================================
(
    'Beginner',
    '1',
    'fill_gap',
    'Hello! I ___ a new student at this school.',
    'Hello! I am a new student at this school.',
    NULL,
    '["am", "is", "are", "be"]'::jsonb,
    'am',
    'Use "am" after the subject pronoun "I".',
    'approved'
),
(
    'Beginner',
    '1',
    'fill_gap',
    '___ your parents at home this evening?',
    'Are your parents at home this evening?',
    NULL,
    '["Are", "Is", "Am", "Be"]'::jsonb,
    'Are',
    '"Your parents" is plural (they), so the question starts with "Are".',
    'approved'
),
(
    'Beginner',
    '1',
    'fill_gap',
    'The weather ___ very warm and sunny today.',
    'The weather is very warm and sunny today.',
    NULL,
    '["is", "are", "am", "be"]'::jsonb,
    'is',
    '"The weather" (it) is singular/uncountable, so it takes "is".',
    'approved'
),
(
    'Beginner',
    '1',
    'fill_gap',
    'No, we ___ tired yet; we want to study more!',
    'No, we aren''t tired yet; we want to study more!',
    NULL,
    '["aren''t", "isn''t", "am not", "not are"]'::jsonb,
    'aren''t',
    'Use "aren''t" (are not) for negative sentences with "we".',
    'approved'
),
(
    'Beginner',
    '1',
    'fill_gap',
    'My coffee ___ cold. Can I have a hot cup, please?',
    'My coffee is cold. Can I have a hot cup, please?',
    NULL,
    '["is", "are", "am", "were"]'::jsonb,
    'is',
    '"My coffee" (it) is singular, so use "is".',
    'approved'
),
(
    'Beginner',
    '1',
    'fill_gap',
    'He ___ from Brazil; he is from Argentina.',
    'He isn''t from Brazil; he is from Argentina.',
    NULL,
    '["isn''t", "aren''t", "am not", "not is"]'::jsonb,
    'isn''t',
    'Use "isn''t" (is not) for negative statements with "he".',
    'approved'
),

-- ============================================================
-- TYPE C: word_order (6 questions)
-- ============================================================
(
    'Beginner',
    '1',
    'word_order',
    'teacher / very / Our / is / kind.',
    'Our teacher is very kind.',
    NULL,
    '["teacher", "very", "Our", "is", "kind."]'::jsonb,
    'Our teacher is very kind.',
    'Start with the subject "Our teacher", followed by "is" and "very kind."',
    'approved'
),
(
    'Beginner',
    '1',
    'word_order',
    'you / Are / ready / for / class?',
    'Are you ready for class?',
    NULL,
    '["you", "Are", "ready", "for", "class?"]'::jsonb,
    'Are you ready for class?',
    'Yes/No questions with "to be" start with "Are" + subject "you".',
    'approved'
),
(
    'Beginner',
    '1',
    'word_order',
    'not / I / late / am / today.',
    'I am not late today.',
    NULL,
    '["not", "I", "late", "am", "today."]'::jsonb,
    'I am not late today.',
    'Place "not" directly after the verb "am" in negative sentences.',
    'approved'
),
(
    'Beginner',
    '1',
    'word_order',
    'friends / My / in / are / London.',
    'My friends are in London.',
    NULL,
    '["friends", "My", "in", "are", "London."]'::jsonb,
    'My friends are in London.',
    'Plural subject "My friends" is followed by "are" + location "in London."',
    'approved'
),
(
    'Beginner',
    '1',
    'word_order',
    'she / Is / your / younger / sister?',
    'Is she your younger sister?',
    NULL,
    '["she", "Is", "your", "younger", "sister?"]'::jsonb,
    'Is she your younger sister?',
    'Start the question with "Is" + subject "she" + "your younger sister?".',
    'approved'
),
(
    'Beginner',
    '1',
    'word_order',
    'keys / The / on / are / the / table.',
    'The keys are on the table.',
    NULL,
    '["keys", "The", "on", "are", "the", "table."]'::jsonb,
    'The keys are on the table.',
    '"The keys" is plural, followed by "are" and the prepositional phrase "on the table."',
    'approved'
);
