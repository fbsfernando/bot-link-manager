import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CreateSessionData {
  name: string;
  start?: boolean;
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
  };
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

interface UseWhatsAppActionsReturn {
  createSession: (data: CreateSessionData) => Promise<{ success: boolean; error?: string; session?: any }>;
  updateSession: (data: UpdateSessionData) => Promise<{ success: boolean; error?: string; session?: any }>;
  loading: boolean;
}

export const useWhatsAppActions = (): UseWhatsAppActionsReturn => {
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();

  const createSession = async (data: CreateSessionData) => {
    if (!session?.access_token) {
      return { success: false, error: 'No authentication token available' };
    }

    setLoading(true);

    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('create-whatsapp-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: data
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      return { success: true, session: result.session };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      console.error('Error creating WhatsApp session:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateSession = async (data: UpdateSessionData) => {
    if (!session?.access_token) {
      return { success: false, error: 'No authentication token available' };
    }

    setLoading(true);

    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('update-whatsapp-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: data
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      return { success: true, session: result.session };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update session';
      console.error('Error updating WhatsApp session:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    createSession,
    updateSession,
    loading,
  };
};