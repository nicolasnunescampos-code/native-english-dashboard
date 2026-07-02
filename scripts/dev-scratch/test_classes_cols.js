import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('classes').insert([{ 
    title: 'test', 
    date: '2026-05-14', 
    time: '10:00',
    class_level: 'Beginner',
    start_time: '2026-05-14T14:00:00Z',
    timezone: 'America/New_York'
  }]);
  console.log('Error:', error);
}
check();
