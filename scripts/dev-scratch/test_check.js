import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.rpc('test_query', { query_text: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'teachers';" });
  console.log(data, error);
}

checkSchema();
