import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
     email: 'nicolasnunescampos@gmail.com',
     password: 'admin'
  });
  
  if (authErr) {
    const { data: authData2, error: authErr2 } = await supabase.auth.signInWithPassword({
       email: 'nicolasnunescampos@gmail.com',
       password: 'password123'
    });
  }

  // check Kathrein
  const { data: kathreinStudents, error: ksErr } = await supabase.from('students').select('*').ilike('student_name', '%Kathrein%');
  console.log("Kathrein Students:", kathreinStudents);

  const { data: kathreinClasses, error: kcErr } = await supabase.from('classes')
    .select('id, date, time, student_name, event_id, status, title')
    .ilike('student_name', '%Kathrein%')
    .order('date', { ascending: true })
    .limit(10);
  console.log("Kathrein Classes (first 10):", kathreinClasses);

  // check Bruno
  const { data: brunoStudents, error: bsErr } = await supabase.from('students').select('*').ilike('student_name', '%Bruno Oliveira%');
  console.log("Bruno Students:", brunoStudents);

  const { data: brunoClasses, error: bcErr } = await supabase.from('classes')
    .select('id, date, time, student_name, event_id, status, title')
    .ilike('student_name', '%Bruno Oliveira%')
    .order('date', { ascending: true })
    .limit(10);
  console.log("Bruno Classes (first 10):", brunoClasses);
}
run();
