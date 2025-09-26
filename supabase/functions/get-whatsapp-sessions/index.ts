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

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

interface WhatsAppSession {
  name: string;
  status: string;
  me?: {
    id: string;
    pushName: string;
  };
  assignedWorker?: string;
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
      hmac?: string;
      retries?: number;
      customHeaders?: any[];
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

    console.log('Fetching sessions for user:', user.id);

    // Get user profile to obtain email for filtering
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    const userEmail = profile.email;
    console.log('User email for filtering:', userEmail);

    // Get the base URL from request body or use a default
    const { baseUrl } = await req.json().catch(() => ({ baseUrl: 'https://api.whatsapp.com' }));

    // Make request to external WhatsApp API
    const response = await fetch(`${baseUrl}/api/sessions?all=true`, {
      method: 'GET',
      headers: {
        'X-Api-Key': whatsappApiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const allSessions: WhatsAppSession[] = await response.json();
    console.log('Total sessions from API:', allSessions.length);

    // Filter sessions by user email in metadata
    const userSessions = allSessions.filter(session => {
      const userIdInMetadata = session.config?.metadata?.["user.email"];
      return userIdInMetadata === userEmail;
    });

    console.log('Filtered sessions for user:', userSessions.length);

    // Transform sessions to match our interface
    const transformedSessions = userSessions.map(session => ({
      name: session.name,
      status: session.status,
      me: session.me,
      assignedWorker: session.assignedWorker,
      config: {
        metadata: session.config?.metadata,
        proxy: session.config?.proxy,
        debug: session.config?.debug || false,
        webhooks: session.config?.webhooks || []
      }
    }));

    return new Response(JSON.stringify({
      sessions: transformedSessions,
      total: transformedSessions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-whatsapp-sessions function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      sessions: [],
      total: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});