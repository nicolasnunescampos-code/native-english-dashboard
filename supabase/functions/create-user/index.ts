import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Create User Function invoked")

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

    const payload = await req.json()
    const { email, password, name, role } = payload

    if (!['student', 'teacher', 'admin'].includes(role)) {
      throw new Error('Invalid role specified')
    }

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
      app_metadata: { role } // This is crucial for middleware/RLS (if used) and direct role checks
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    const userId = authData.user.id

    // 2. Insert into respective table based on role
    if (role === 'student') {
      const { classes_per_week, cpf, payment_amount } = payload
      const { error: studentError } = await supabaseClient
        .from('students')
        .insert({
          id: userId,
          email: email.toLowerCase(),
          student_name: name,
          classes_per_week: classes_per_week || 0,
          cpf,
          payment_amount
        })

      if (studentError) {
        console.error('Student insert error:', studentError)
        throw studentError
      }

      // 3. Create initial payment if amount is provided (for student)
      if (payment_amount) {
        const { error: paymentError } = await supabaseClient
            .from('payments')
            .insert({
                student_id: userId,
                student_name: name,
                amount: payment_amount,
                status: 'pending',
                notes: 'Initial entry'
            })
        if (paymentError) console.error('Payment insert error:', paymentError)
      }
    } else if (role === 'teacher') {
      const { color, meet_link } = payload
      const { error: teacherError } = await supabaseClient
        .from('teachers')
        .insert({
          id: userId,
          name: name,
          color: color || '#3b82f6', // default blue if not provided
          meet_link: meet_link || ''
        })

      if (teacherError) {
        console.error('Teacher insert error:', teacherError)
        throw teacherError
      }
    } else if (role === 'admin') {
      // In case we want an 'admins' table
      const { error: adminError } = await supabaseClient
        .from('admins')
        .insert({
          id: userId,
          name: name,
          email: email.toLowerCase()
        })

      if (adminError) {
        // If the table doesn't exist yet, we capture it but do not fail the function entirely
        // since the user was created in Auth correctly with admin role.
        console.error('Admin insert error:', adminError)
      }
    }

    return new Response(
      JSON.stringify({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`, userId }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      },
    )

  } catch (error: any) {
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
