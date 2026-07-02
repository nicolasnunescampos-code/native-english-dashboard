import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const { data: exam, error } = await supabase.from('exams').insert({
    title: 'Beginner Test - Verb To Be',
    chapter_number: 5,
    level: 'Beginner'
  }).select().single();

  if (error) {
    console.error("Error inserting exam", error);
    return;
  }
  console.log("Inserted Exam:", exam);

  const { error: qError } = await supabase.from('questions').insert([
    {
      exam_id: exam.id,
      question_text: 'I ___ a student.',
      type: 'fill-in-the-blank',
      correct_answer: 'am',
      points: 10
    },
    {
      exam_id: exam.id,
      question_text: 'She ___ from Brazil.',
      type: 'fill-in-the-blank',
      correct_answer: 'is',
      points: 10
    },
    {
      exam_id: exam.id,
      question_text: 'They ___ my friends.',
      type: 'fill-in-the-blank',
      correct_answer: 'are',
      points: 10
    }
  ]);

  if (qError) {
    console.error("Error inserting questions", qError);
  } else {
    console.log("Questions inserted successfully!");
  }
}

run();
