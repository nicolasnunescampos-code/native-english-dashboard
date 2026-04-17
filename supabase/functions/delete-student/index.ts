import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Delete Student Function invoked")

Deno.serve(async (req) => {
  // CORS setup
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
          auth: {
              autoRefreshToken: false,
              persistSession: false
          }
      }
    )

    const { student_id } = await req.json()

    if (!student_id) {
       throw new Error('student_id is required')
    }

    // 1. Delete user from auth table. This should cascade to public.students if foreign key constraint with cascade is set.
    // If not, we still manually delete from public tables just to be safe.
    
    // First let's find the student name for logging and maybe deleting payments if they only use student_name
    const { data: student } = await supabaseClient
      .from('students')
      .select('student_name')
      .eq('id', student_id)
      .single();

    // Delete related records (payments, classes, etc) explicitly in case cascade isn't configured
    await supabaseClient.from('payments').delete().eq('student_id', student_id)
    if (student?.student_name) {
      await supabaseClient.from('payments').delete().eq('student_name', student?.student_name)
    }

    // Then delete from 'students' table manually
    await supabaseClient.from('students').delete().eq('id', student_id)

    // And lastly delete from Auth
    const { error: authError } = await supabaseClient.auth.admin.deleteUser(student_id)

    if (authError) {
        console.log("Warning: auth user deletion failed, perhaps user doesn't exist in auth.", authError)
    }

    return new Response(
      JSON.stringify({ message: "Student and related data deleted successfully" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      },
    )
  }
})
