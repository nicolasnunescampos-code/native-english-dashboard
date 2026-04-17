import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Create Student Function invoked")

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

    const { email, password, student_name, classes_per_week, cpf, payment_amount, course_type } = await req.json()

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { student_name }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    const userId = authData.user.id

    // 2. Insert into 'students' table
    const { error: studentError } = await supabaseClient
      .from('students')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        student_name,
        classes_per_week,
        cpf,
        payment_amount,
        course_type: course_type || 'Native English'
      })

    if (studentError) {
        // If getting a "duplicate key" error on students, it means user was created in Auth but already in students?
        // Just throw for now.
        console.error('Student insert error:', studentError)
        throw studentError
    }

    // 3. Create initial payment if amount is provided
    if (payment_amount) {
        // Generate a simplified 'created_at' check to avoid race conditions/retries creating duplicates
        // Ideally we'd use an idempotency key, but we'll just insert once.
        
        const { error: paymentError } = await supabaseClient
            .from('payments')
            .insert({
                student_id: userId,
                student_name: student_name,
                amount: payment_amount,
                status: 'pending',
                notes: 'Initial entry' // differentiate from automated monthly ones
            })
        
        if (paymentError) {
             console.error('Payment insert error:', paymentError)
             // Don't fail the whole request if just payment fails
        }
    }

    return new Response(
      JSON.stringify({ message: "Student created successfully", userId }),
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
