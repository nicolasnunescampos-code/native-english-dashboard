import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
     email: 'vitoriaalves86@gmail.com',
     password: 'password123'
  });
  if (authErr) {
     console.error("Auth error:", authErr.message);
     return;
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('student_name', 'Vitoria Alves')

  console.log("Payments for Vitoria:", data);
  console.error("Error:", error);
}

check();
