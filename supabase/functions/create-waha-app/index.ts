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

interface CreateAppRequest {
  id?: string;
  session: string;
  app: string;
  enabled?: boolean;
  config: Record<string, unknown>;
}

interface WahaSessionResponse {
  name: string;
  config?: {
    metadata?: Record<string, string>;
  };
}

const normalizeId = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);

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

    const requestData = await req.json() as CreateAppRequest;

    if (!requestData?.session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!requestData.app) {
      return new Response(
        JSON.stringify({ success: false, error: 'App type is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!requestData.config || typeof requestData.config !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: 'Config is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const sessionName = requestData.session.trim();
    await verifySessionOwnership(sessionName, profile.email);

    const appId = normalizeId(
      requestData.id ?? `${sessionName}-${requestData.app}`,
    );

    const payload = {
      id: appId,
      session: sessionName,
      app: requestData.app,
      config: requestData.config,
      ...(typeof requestData.enabled === 'boolean'
        ? { enabled: requestData.enabled }
        : {}),
    };

    const response = await fetch(`${wahaBaseUrl}/api/apps`, {
      method: 'POST',
      headers: {
        'X-Api-Key': whatsappApiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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

    const app = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        app,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in create-waha-app function:', error);
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
