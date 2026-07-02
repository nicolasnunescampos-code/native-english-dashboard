import { createClient } from '@supabase/supabase-js'

const envFile = `VITE_SUPABASE_URL=https://ibykhkbyzifddwnsfxxy.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4`;

const supabase = createClient('https://ibykhkbyzifddwnsfxxy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4');

async function run() {
  // Let's get the service role key to bypass RLS, or we can just try to see if questions are readable
  const { data, error } = await supabase.from('questions').select('correct_answer');
  if (error) console.log(error);
  if (data) {
    const nulls = data.filter(d => d.correct_answer === null || d.correct_answer === undefined);
    console.log('Null correct answers:', nulls.length);
  }
}
run();
