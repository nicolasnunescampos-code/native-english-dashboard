import { createClient } from 'npm:@supabase/supabase-js@2'

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost'
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test'

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

async function test() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.00000000-0000-0000-0000-000000000000,receiver_id.eq.00000000-0000-0000-0000-000000000001),and(sender_id.eq.00000000-0000-0000-0000-000000000001,receiver_id.eq.00000000-0000-0000-0000-000000000000)`)
  console.log("Error:", error)
  console.log("Data:", data)
}
test()
