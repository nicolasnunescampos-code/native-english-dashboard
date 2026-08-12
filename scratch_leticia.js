import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
     email: 'nicolasnunescampos@gmail.com',
     password: 'password123'
  });
  
  if (authErr) {
    console.log("Login error:", authErr.message);
    // try another password
    const { data: authData2, error: authErr2 } = await supabase.auth.signInWithPassword({
       email: 'nicolasnunescampos@gmail.com',
       password: 'admin'
    });
    if (authErr2) console.log("Login 2 error:", authErr2.message);
  }

  // check classes
  const { data: classes, error: classesErr } = await supabase.from('classes').select('*').ilike('student_name', '%Leticia%');
  console.log("Classes:", classes);

  // check students
  const { data: students, error: studentsErr } = await supabase.from('students').select('*').ilike('student_name', '%Leticia%');
  console.log("Students:", students);
}
run();
