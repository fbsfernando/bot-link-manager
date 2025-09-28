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

    console.log('Getting QR for user:', user.id)

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
    const wahaApiKey = Deno.env.get('WHATSAPP_API_KEY')
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

    // Get QR code from WAHA API - using WAHA_BASE_URL
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL')
    const wahaResponse = await fetch(
      `${wahaBaseUrl}/api/${sessionName}/auth/qr?format=image`,
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

    // Get the image as array buffer and convert to base64
    const imageBuffer = await wahaResponse.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

    return new Response(
      JSON.stringify({ 
        qrData: {
          data: base64Image,
          mimetype: 'image/png'
        }
      }),
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