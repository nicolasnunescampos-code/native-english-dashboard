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
    if (authErr2) console.log("Login failed", authErr2.message);
  }

  const { data: students, error: sErr } = await supabase.from('students').select('id, student_name').limit(50);
  if (sErr) console.error("Error fetching students:", sErr);
  else console.log("Students:", students.map(s => s.student_name).join(', '));

}
run();
