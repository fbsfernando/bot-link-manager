import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY') ?? '';
const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL') ?? '';

const supabase = createClient(supabaseUrl, supabaseKey);

const verifyEnv = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials are not configured');
  }

  if (!whatsappApiKey) {
    throw new Error('WAHA API key is not configured');
  }

  if (!wahaBaseUrl) {
    throw new Error('WAHA base URL is not configured');
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    verifyEnv();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const response = await fetch(`${wahaBaseUrl}/api/apps/chatwoot/locales`, {
      method: 'GET',
      headers: {
        'X-Api-Key': whatsappApiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `WAHA API error: ${response.status} ${response.statusText} - ${errorText}`,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const locales = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        locales,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in get-waha-chatwoot-locales function:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
