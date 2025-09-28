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

    // Filter out protected metadata fields from user input
    if (config?.metadata) {
      const protectedFields = ['user.id', 'user.email']
      const filteredMetadata = Object.fromEntries(
        Object.entries(config.metadata).filter(([key]) => !protectedFields.includes(key))
      )
      // Replace the metadata with filtered version
      config.metadata = filteredMetadata
      console.log('Filtered metadata:', filteredMetadata)
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
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (wahaApiKey) {
      wahaHeaders['X-Api-Key'] = wahaApiKey
    }

    // Get current session to preserve protected metadata
    const getCurrentSessionUrl = `${wahaBaseUrl}/api/sessions/${sessionName}`
    const currentSessionResponse = await fetch(getCurrentSessionUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(wahaApiKey && { 'X-Api-Key': wahaApiKey })
      }
    })

    let currentMetadata = {}
    if (currentSessionResponse.ok) {
      const currentSession = await currentSessionResponse.json()
      currentMetadata = currentSession.config?.metadata || {}
    }

    // Merge config preserving protected metadata
    const finalConfig = {
      ...config,
      metadata: {
        // Preserve protected fields from current session
        ...(currentMetadata ? Object.fromEntries(
          Object.entries(currentMetadata).filter(([key]) => 
            ['user.id', 'user.email'].includes(key)
          )
        ) : {}),
        // Add user-provided metadata
        ...(config?.metadata || {})
      }
    }

    // Update session configuration via WAHA API using PUT method
    const updateUrl = `${wahaBaseUrl}/api/sessions/${sessionName}`
    console.log('Updating session via WAHA API:', updateUrl)

    const wahaResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: wahaHeaders,
      body: JSON.stringify({ config: finalConfig }),
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