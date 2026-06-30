import { createClient } from '@supabase/supabase-js';

// We just read directly from the VITE vars in .env.local manually to avoid dotenv
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of envFile.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].trim();
    }
}

if (!supabaseUrl) {
    const envFile2 = fs.readFileSync('.env', 'utf-8');
    for (const line of envFile2.split('\n')) {
        if (line.startsWith('VITE_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].trim();
        }
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].trim();
        }
    }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking max id...");
  const { data: maxIdData, error: maxErr } = await supabase.from('classes').select('id').order('id', { ascending: false }).limit(1);
  console.log('Max ID:', maxIdData, maxErr);
  
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
  }
}

check();
