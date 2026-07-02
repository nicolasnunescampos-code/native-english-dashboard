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
  console.log("Fetching classes constraints...");
  const { data, error } = await supabase.rpc('get_schema_info'); // if exists, probably not
  
  // Just try inserting
  console.log("Trying test insert...");
  const { data: insertData, error: insertError } = await supabase.from('classes').insert({
    date: '2026-01-01',
    status: 'draft',
    title: 'Test insert',
    student_name: 'Test',
    time: '10:00'
  }).select();
  
  console.log('Insert Result:', insertData, insertError);
  
  if (insertData && insertData[0]) {
      // clean up
      await supabase.from('classes').delete().eq('id', insertData[0].id);
  }
}

check();
