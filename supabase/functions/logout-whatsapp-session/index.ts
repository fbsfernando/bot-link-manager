import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    
    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    console.log('Authenticated user:', user.id)

    // Parse request body
    const { sessionName } = await req.json()
    console.log('Logout session request:', sessionName)

    if (!sessionName) {
      return new Response(
        JSON.stringify({ error: 'Session name is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get WAHA API configuration
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL')
    const wahaApiKey = Deno.env.get('WHATSAPP_API_KEY')
    
    if (!wahaBaseUrl) {
      console.error('WAHA_BASE_URL not configured')
      return new Response(
        JSON.stringify({ error: 'WAHA API not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const wahaHeaders: Record<string, string> = {
      'Accept': 'application/json',
    }

    if (wahaApiKey) {
      wahaHeaders['X-Api-Key'] = wahaApiKey
    }

    // Logout session via WAHA API
    const logoutUrl = `${wahaBaseUrl}/api/sessions/${sessionName}/logout`
    console.log('Logging out session via WAHA API:', logoutUrl)

    const wahaResponse = await fetch(logoutUrl, {
      method: 'POST',
      headers: wahaHeaders,
    })

    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text()
      console.error('WAHA API error:', errorText)
      return new Response(
        JSON.stringify({ 
          error: `Failed to logout session: ${wahaResponse.status} ${wahaResponse.statusText}`,
          details: errorText
        }),
        { 
          status: wahaResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = await wahaResponse.json()
    console.log('Session logged out successfully:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        session: result,
        message: `Session ${sessionName} logged out successfully` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error logging out WhatsApp session:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})