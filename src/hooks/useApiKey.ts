import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UseApiKeyReturn {
  apiKey: string | null;
  loading: boolean;
  error: string | null;
  regenerateApiKey: () => Promise<string | null>;
}

export const useApiKey = (): UseApiKeyReturn => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();

  const fetchApiKey = async () => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('api_key')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      setApiKey(data?.api_key || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch API key';
      setError(errorMessage);
      console.error('Error fetching API key:', err);
    } finally {
      setLoading(false);
    }
  };

  const regenerateApiKey = async (): Promise<string | null> => {
    if (!session?.access_token) {
      setError('No authentication token available');
      return null;
    }

    try {
      setError(null);
      const { data, error: invokeError } = await supabase.functions.invoke('regenerate-api-key', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const newApiKey = data.api_key;
      setApiKey(newApiKey);
      return newApiKey;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate API key';
      setError(errorMessage);
      console.error('Error regenerating API key:', err);
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      fetchApiKey();
    } else {
      setApiKey(null);
      setLoading(false);
    }
  }, [user]);

  return {
    apiKey,
    loading,
    error,
    regenerateApiKey,
  };
};