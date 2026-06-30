-- Fix out of sync sequence for classes table
-- This typically happens after importing a CSV backup
SELECT setval('classes_id_seq', (SELECT MAX(id) FROM classes));
