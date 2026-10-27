import { createClient } from "@supabase/supabase-js";
const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const payload = {
    date: '2026-08-25',
    status: 'published',
    title: 'Test Class Vinicius',
    student_name: 'Vinicius Gross',
    time: '18:00',
    timezone: 'America/Sao_Paulo',
    link_url: '',
    class_level: 'Mixed',
    teacher_id: 'some-teacher-id',
    event_id: 'calc-test-123'
  };
  const { data, error } = await supabase.from('classes').insert(payload).select();
  console.log("Error:", error);
  console.log("Inserted:", data);
}
run();
