import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: maxIdData } = await supabase.from('classes').select('id').order('id', { ascending: false }).limit(1);
  console.log('Max ID in table:', maxIdData);
  
  const { data, error } = await supabase.from('classes').insert({
    date: '2026-01-01',
    status: 'draft',
    title: 'Test sequence',
    student_name: 'Test',
    time: '10:00'
  }).select();
  console.log('Insert result:', data, error);
}

check();
