import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('date', '2026-06-25')
    .ilike('time', '11:00%');
  
  if (error) console.error(error);
  else {
    console.log(JSON.stringify(data.map(c => ({ id: c.id, title: c.title, student_name: c.student_name, time: c.time, event_id: c.event_id, teacher_id: c.teacher_id })), null, 2));
  }
}
run();
