import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching top 5 classes by ID...");
  const { data: maxIdData, error: maxErr } = await supabase.from('classes').select('id').order('id', { ascending: false }).limit(5);
  console.log('Top 5 IDs:', maxIdData, maxErr);
  
  // Try inserting
  console.log("Trying test insert...");
  const { data, error } = await supabase.from('classes').insert({
    date: '2026-01-01',
    status: 'draft',
    title: 'Test insert',
    student_name: 'Test',
    time: '10:00'
  }).select();
  
  console.log('Insert Result:', data, error);
  
  if (data && data[0]) {
      // clean up
      await supabase.from('classes').delete().eq('id', data[0].id);
      console.log('Cleaned up ID:', data[0].id);
  }
}

check();
