import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  // Querying information_schema from client is usually forbidden by RLS, but let's try
  const { data, error } = await supabase.from('information_schema.columns').select('*').eq('table_name', 'messages');
  console.log("Schema Error:", error?.message || 'Success');
  console.log("Data:", data);
}
run();
