import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    const { data: messages, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(20);
    console.log("Last 20 messages:", messages);
    if (error) console.error("Error fetching messages:", error);

    const { data: teachers } = await supabase.from('teachers').select('id, name');
    console.log("Teachers:", teachers);

    const { data: students } = await supabase.from('students').select('id, student_name');
    console.log("Students:", students);
}

test();
