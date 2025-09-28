import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GetQRData {
  sessionName: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const { sessionName }: GetQRData = await req.json()

    if (!sessionName) {
      return new Response(
        JSON.stringify({ error: 'Session name is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get WAHA API key from secrets
    const wahaApiKey = Deno.env.get('WAHA_API_KEY')
    if (!wahaApiKey) {
      console.error('WAHA_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'WAHA API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get QR code from WAHA API
    const wahaResponse = await fetch(
      `http://waha.ocaradosbots.tech:3000/api/${sessionName}/auth/qr?format=image`,
      {
        method: 'GET',
        headers: {
          'Accept': 'image/png',
          'X-Api-Key': wahaApiKey,
        },
      }
    )

    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text()
      console.error('WAHA API error:', wahaResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `Failed to get QR code: ${wahaResponse.status} ${errorText}` 
        }),
        {
          status: wahaResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const qrData = await wahaResponse.json()

    return new Response(
      JSON.stringify({ qrData }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in get-whatsapp-qr function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})