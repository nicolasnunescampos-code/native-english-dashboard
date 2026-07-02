import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.functions.invoke("create-student", {
    body: {
      email: "test.shortpass@example.com",
      password: "12345", // EXACTLY 5 CHARACTERS
      student_name: "Short Pass",
      classes_per_week: 1,
      cpf: "",
      payment_amount: "280",
      course_type: "Native English",
    },
  });

  if (error) {
    console.error("Error calling edge function:", error);
    if (error.context) {
        let resp = await error.context.text();
        console.error("Response body:", resp);
    }
  } else {
    console.log("Success:", data);
  }
}

test();
