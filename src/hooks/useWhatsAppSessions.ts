import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface WhatsAppSessionMe {
  id: string;
  pushName: string;
}

interface WhatsAppSessionConfig {
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
}

export interface WhatsAppSession {
  name: string;
  status: string;
  me?: WhatsAppSessionMe;
  assignedWorker?: string;
  config?: WhatsAppSessionConfig;
}

interface UseWhatsAppSessionsReturn {
  sessions: WhatsAppSession[];
  loading: boolean;
  error: string | null;
  refetch: (baseUrl?: string) => Promise<void>;
}

export const useWhatsAppSessions = (baseUrl?: string): UseWhatsAppSessionsReturn => {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const fetchSessions = async (apiBaseUrl?: string) => {
    if (!session?.access_token) {
      setError('No authentication token available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('get-whatsapp-sessions', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          baseUrl: apiBaseUrl || baseUrl || 'https://api.whatsapp.com'
        }
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSessions(data.sessions || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sessions';
      setError(errorMessage);
      console.error('Error fetching WhatsApp sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async (apiBaseUrl?: string) => {
    await fetchSessions(apiBaseUrl);
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchSessions();
    }
  }, [session?.access_token, baseUrl]);

  return {
    sessions,
    loading,
    error,
    refetch,
  };
};