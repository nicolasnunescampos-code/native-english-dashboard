import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_triggers'); // won't work
  
  // Just fetch a message to see if it's truncated
  const { data: messages, error: err } = await supabase.from('messages').select('content').order('created_at', { ascending: false }).limit(10);
  console.log("MESSAGES:", JSON.stringify(messages, null, 2));
}
run();
