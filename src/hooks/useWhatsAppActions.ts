import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { WahaApp, WahaAppType } from '@/types/waha';

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

interface CreateAppData {
  id?: string;
  session: string;
  app: WahaAppType;
  enabled?: boolean;
  config: Record<string, unknown>;
}

interface UpdateAppData {
  id: string;
  session: string;
  app: WahaAppType;
  enabled?: boolean;
  config: Record<string, unknown>;
}

interface DeleteAppData {
  id: string;
  session: string;
}

interface UseWhatsAppActionsReturn {
  createSession: (data: CreateSessionData) => Promise<{ success: boolean; error?: string; session?: any }>;
  updateSession: (data: UpdateSessionData) => Promise<{ success: boolean; error?: string; session?: any }>;
  restartSession: (sessionName: string) => Promise<{ success: boolean; error?: string; session?: any }>;
  deleteSession: (sessionName: string) => Promise<any>;
  logoutSession: (sessionName: string) => Promise<any>;
  stopSession: (sessionName: string) => Promise<any>;
  createApp: (data: CreateAppData) => Promise<{ success: boolean; error?: string; app?: WahaApp }>;
  updateApp: (data: UpdateAppData) => Promise<{ success: boolean; error?: string; app?: WahaApp }>;
  deleteApp: (data: DeleteAppData) => Promise<{ success: boolean; error?: string }>;
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

  const restartSession = async (sessionName: string) => {
    if (!session?.access_token) {
      return { success: false, error: 'No authentication token available' };
    }

    setLoading(true);

    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('restart-whatsapp-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { sessionName }
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      return { success: true, session: result.session };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restart session';
      console.error('Error restarting WhatsApp session:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionName: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('delete-whatsapp-session', {
        body: { sessionName },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error deleting WhatsApp session:', error);
        throw new Error(error.message || 'Edge Function returned a non-2xx status code');
      }

      return data;
    } catch (error) {
      console.error('Error deleting WhatsApp session:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logoutSession = async (sessionName: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('logout-whatsapp-session', {
        body: { sessionName },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error logging out WhatsApp session:', error);
        throw new Error(error.message || 'Edge Function returned a non-2xx status code');
      }

      return data;
    } catch (error) {
      console.error('Error logging out WhatsApp session:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async (sessionName: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('stop-whatsapp-session', {
        body: { sessionName },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error stopping WhatsApp session:', error);
        throw new Error(error.message || 'Edge Function returned a non-2xx status code');
      }

      return data;
    } catch (error) {
      console.error('Error stopping WhatsApp session:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createApp = async (data: CreateAppData) => {
    if (!session?.access_token) {
      return { success: false, error: 'No authentication token available' };
    }

    setLoading(true);

    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('create-waha-app', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: data,
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      return { success: true, app: result.app as WahaApp };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create app';
      console.error('Error creating WAHA app:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateApp = async (data: UpdateAppData) => {
    if (!session?.access_token) {
      return { success: false, error: 'No authentication token available' };
    }

    setLoading(true);

    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('update-waha-app', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: data,
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      return { success: true, app: result.app as WahaApp };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update app';
      console.error('Error updating WAHA app:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const deleteApp = async (data: DeleteAppData) => {
    if (!session?.access_token) {
      return { success: false, error: 'No authentication token available' };
    }

    setLoading(true);

    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('delete-waha-app', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: data,
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete app';
      console.error('Error deleting WAHA app:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    createSession,
    updateSession,
    restartSession,
    deleteSession,
    logoutSession,
    stopSession,
    createApp,
    updateApp,
    deleteApp,
    loading,
  };
};
