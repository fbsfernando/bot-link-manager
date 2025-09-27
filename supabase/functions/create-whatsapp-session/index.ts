import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY')!;
const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL')!;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

interface CreateSessionRequest {
  name: string;
  start?: boolean;
  config?: {
    metadata?: {
      "user.id": string;
      "user.email": string;
    };
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
  };
}

serve(async (req) => {
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
    
    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    console.log('Creating session for user:', user.id);

    // Get user profile to obtain email for metadata
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    const userEmail = profile.email;
    console.log('User email for metadata:', userEmail);

    // Get session data from request
    const sessionData: CreateSessionRequest = await req.json();

    // Prepare session creation payload with user metadata
    const payload = {
      ...sessionData,
      config: {
        ...sessionData.config,
        metadata: {
          "user.id": user.id,
          "user.email": userEmail,
          ...sessionData.config?.metadata
        }
      }
    };

    console.log('Creating session with payload:', JSON.stringify(payload, null, 2));

    // Make request to external WhatsApp API to create session
    const response = await fetch(`${wahaBaseUrl}/api/sessions`, {
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
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const createdSession = await response.json();
    console.log('Session created successfully:', createdSession.name);

    return new Response(JSON.stringify({
      success: true,
      session: createdSession
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-whatsapp-session function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});