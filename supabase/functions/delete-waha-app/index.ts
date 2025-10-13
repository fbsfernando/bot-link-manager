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

interface DeleteAppRequest {
  id: string;
  session: string;
}

interface WahaSessionResponse {
  name: string;
  config?: {
    metadata?: Record<string, string>;
  };
}

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

const verifySessionOwnership = async (sessionName: string, userEmail: string) => {
  const response = await fetch(`${wahaBaseUrl}/api/sessions/${sessionName}`, {
    method: 'GET',
    headers: {
      'X-Api-Key': whatsappApiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to load session ${sessionName}: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const sessionData = await response.json() as WahaSessionResponse;
  const ownerEmail = sessionData.config?.metadata?.['user.email'];

  if (!ownerEmail || ownerEmail !== userEmail) {
    throw new Error('Você não tem permissão para gerenciar apps desta sessão');
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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.email) {
      throw new Error('User profile not found');
    }

    const requestData = await req.json() as DeleteAppRequest;

    if (!requestData?.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'App ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!requestData.session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const sessionName = requestData.session.trim();
    await verifySessionOwnership(sessionName, profile.email);

    const response = await fetch(
      `${wahaBaseUrl}/api/apps/${encodeURIComponent(requestData.id)}`,
      {
        method: 'DELETE',
        headers: {
          'X-Api-Key': whatsappApiKey,
          'Accept': 'application/json',
        },
      },
    );

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

    let result: unknown = null;
    const responseText = await response.text();

    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch {
        result = responseText;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in delete-waha-app function:', error);
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
