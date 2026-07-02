import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_schema_info'); // Wait, RPC might not exist.
  // Better: insert a very long string and see if it fails.
  const { error: err1 } = await supabase.from('messages').insert({
    sender_id: '00000000-0000-0000-0000-000000000000', // might violate fkey
    receiver_id: '00000000-0000-0000-0000-000000000000',
    content: 'A'.repeat(5000)
  });
  console.log("Insert Error:", err1);
}
run();
