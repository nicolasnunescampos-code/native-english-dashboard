import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
console.log("Got client");
