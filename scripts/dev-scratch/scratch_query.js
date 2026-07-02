import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('date', '2026-06-25');
  
  if (error) console.error(error);
  else {
    const at11 = data.filter(c => c.time === '11:00' || c.start_time?.includes('11:00'));
    console.log(JSON.stringify(at11.map(c => ({ title: c.title, student_name: c.student_name, time: c.time, link_url: c.link_url, event_id: c.event_id, status: c.status })), null, 2));
  }
}
run();
