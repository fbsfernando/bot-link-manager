import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateSessionData {
  sessionName: string;
  config?: {
    proxy?: {
      server: string;
      username?: string;
      password?: string;
    };
    debug?: boolean;
    webhooks?: Array<{
      url: string;
      events: string[];
      hmac?: {
        key: string;
      };
      retries?: {
        delaySeconds: number;
        attempts: number;
        policy: string;
      };
      customHeaders?: Array<{
        name: string;
        value: string;
      }>;
    }>;
    metadata?: {
      [key: string]: string;
    };
  };
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
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Set auth header for supabase client
    supabaseClient.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: ''
    })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Authenticated user:', user.id)

    // Parse request body
    const requestData: UpdateSessionData = await req.json()
    console.log('Update session request:', requestData)

    const { sessionName, config } = requestData

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
    const wahaApiKey = Deno.env.get('WAHA_API_KEY')
    
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
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (wahaApiKey) {
      wahaHeaders['X-Api-Key'] = wahaApiKey
    }

    // Update session configuration via WAHA API
    const updateUrl = `${wahaBaseUrl}/api/sessions/${sessionName}`
    console.log('Updating session via WAHA API:', updateUrl)

    const wahaResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: wahaHeaders,
      body: JSON.stringify({ config }),
    })

    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text()
      console.error('WAHA API error:', errorText)
      return new Response(
        JSON.stringify({ 
          error: `Failed to update session: ${wahaResponse.status} ${wahaResponse.statusText}`,
          details: errorText
        }),
        { 
          status: wahaResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const updatedSession = await wahaResponse.json()
    console.log('Session updated successfully:', updatedSession)

    return new Response(
      JSON.stringify({ 
        success: true, 
        session: updatedSession,
        message: `Session ${sessionName} updated successfully` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error updating WhatsApp session:', error)
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