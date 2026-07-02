const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let envFile = '';
try {
    envFile = fs.readFileSync('.env.local', 'utf-8');
} catch (e) {
    try {
        envFile = fs.readFileSync('.env', 'utf-8');
    } catch(e) {
        console.error("Could not find .env or .env.local");
        process.exit(1);
    }
}

let supabaseUrl = '';
let supabaseKey = '';

for (const line of envFile.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
    }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking max id...");
  const { data: maxIdData } = await supabase.from('classes').select('id').order('id', { ascending: false }).limit(5);
  console.log('Top 5 IDs:', maxIdData);
  
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
