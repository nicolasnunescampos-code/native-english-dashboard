import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('classes')
    .select('id, student_name, date, is_absent, class_grade')
    .order('date', { ascending: false })
    .limit(20);

  if (error) console.error("Error:", error);
  console.log("Data:");
  data?.forEach(d => console.log(`ID: ${d.id}, Date: ${d.date}, Student: ${d.student_name}, Absent: ${d.is_absent}, Grade: ${d.class_grade}`));
}

check();
