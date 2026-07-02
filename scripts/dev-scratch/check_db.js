require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env vars, reading from .env');
  require('dotenv').config({ path: '.env' });
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  // Check primary key of classes
  const { data, error } = await supabase.rpc('get_primary_keys', { table_name: 'classes' });
  console.log('Primary keys:', data, error);
  
  // Actually we can just select a row
  const { data: row } = await supabase.from('classes').select('*').limit(1);
  console.log('Row sample:', row);
}

check();
