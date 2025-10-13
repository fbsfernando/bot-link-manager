import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ChatwootLocale } from '@/types/waha';

interface UseChatwootLocalesReturn {
  locales: ChatwootLocale[];
  loading: boolean;
  error: string | null;
  fetchLocales: () => Promise<void>;
}

export const useChatwootLocales = (): UseChatwootLocalesReturn => {
  const { session } = useAuth();
  const [locales, setLocales] = useState<ChatwootLocale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocales = useCallback(async () => {
    if (!session?.access_token) {
      setError('No authentication token available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('get-waha-chatwoot-locales', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to load locales');
      }

      const localesList: ChatwootLocale[] = Array.isArray(data.locales)
        ? data.locales
        : [];

      setLocales(localesList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch locales';
      setError(message);
      console.error('Error fetching Chatwoot locales:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  return {
    locales,
    loading,
    error,
    fetchLocales,
  };
};
