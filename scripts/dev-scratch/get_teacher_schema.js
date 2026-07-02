import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ibykhkbyzifddwnsfxxy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4');
async function check() {
  const { data, error } = await supabase.from('teachers').select('*').limit(1);
  console.log(data);
}
check();
