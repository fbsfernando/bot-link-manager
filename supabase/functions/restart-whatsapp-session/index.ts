import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionName } = await req.json();

    if (!sessionName) {
      return new Response(
        JSON.stringify({ error: 'sessionName is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const wahaApiKey = Deno.env.get('WAHA_API_KEY');
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL');

    if (!wahaApiKey || !wahaBaseUrl) {
      console.error('WAHA API configuration missing');
      return new Response(
        JSON.stringify({ error: 'WAHA API configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Restarting WhatsApp session: ${sessionName}`);

    const response = await fetch(`${wahaBaseUrl}/api/sessions/${sessionName}/restart`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': wahaApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`WAHA API error (${response.status}):`, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to restart session: ${response.status} ${errorText}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const sessionData = await response.json();
    console.log('Session restarted successfully:', sessionData);

    return new Response(
      JSON.stringify({ session: sessionData }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error restarting WhatsApp session:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});