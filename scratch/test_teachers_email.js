import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://ibykhkbyzifddwnsfxxy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4')

async function run() {
  const { data, error } = await supabase.rpc('get_schema')
  // RPC get_schema probably doesn't exist, let's just do a raw select if possible? Supabase JS client doesn't allow raw queries unless via RPC.
  // Instead I can do an INSERT which fails and see the error? Or just try to select 'email' from teachers.
  const res = await supabase.from('teachers').select('email').limit(1)
  console.log(res)
}
run()
