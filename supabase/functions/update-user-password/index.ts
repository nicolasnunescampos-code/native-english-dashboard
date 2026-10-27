import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Update User Password Function invoked")

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
    const { userId, newPassword } = payload

    if (!userId || !newPassword) {
      throw new Error('userId and newPassword are required')
    }

    // Verify the caller is an admin (assuming authorization header contains JWT)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callingUser }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !callingUser) {
      throw new Error('Invalid token')
    }

    if (callingUser.app_metadata?.role !== 'admin') {
       throw new Error('Unauthorized: Only admins can change passwords')
    }

    // Use admin API to update password
    const { data: updateData, error: updateError } = await supabaseClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ message: "Password updated successfully" }),
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
