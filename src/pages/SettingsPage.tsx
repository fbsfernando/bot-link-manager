import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useApiKey } from '@/hooks/useApiKey';
import { Copy, RefreshCw, Key, Loader2 } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  api_key: string | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { apiKey, loading: apiKeyLoading, regenerateApiKey } = useApiKey();
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "Chave de API copiada para a área de transferência",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a chave de API",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateApiKey = async () => {
    setRegenerating(true);
    try {
      const newApiKey = await regenerateApiKey();
      if (newApiKey) {
        toast({
          title: "Chave regenerada",
          description: "Nova chave de API foi gerada com sucesso",
        });
      } else {
        toast({
          title: "Erro ao regenerar chave",
          description: "Ocorreu um erro inesperado",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao regenerar chave",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };

  if (profileLoading || apiKeyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie sua chave de API para integração com serviços externos
        </p>
      </div>

      {/* API Key Section */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Chave de API
          </CardTitle>
          <CardDescription>
            Use esta chave para autenticar suas requisições à API do WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="api-key">Sua Chave de API</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Input
                id="api-key"
                type="text"
                value={apiKey || ''}
                readOnly
                className="font-mono text-sm bg-muted"
                placeholder="Carregando chave de API..."
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => apiKey && copyToClipboard(apiKey)}
                disabled={!apiKey}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h4 className="font-medium">Regenerar Chave de API</h4>
              <p className="text-sm text-muted-foreground">
                Gera uma nova chave e invalida a anterior. Use com cuidado.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleRegenerateApiKey}
              disabled={regenerating}
              className="flex items-center gap-2"
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {regenerating ? 'Gerando...' : 'Regenerar'}
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Como usar sua chave de API</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <p>Inclua a chave no header <code className="bg-blue-100 px-1 rounded">X-Api-Key</code> das suas requisições:</p>
              <pre className="bg-blue-100 p-2 rounded text-xs overflow-x-auto">
{`curl -H "X-Api-Key: ${apiKey || 'sua_chave_aqui'}" \\
     -H "Content-Type: application/json" \\
     https://sua-api.com/endpoint`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Info Section */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
          <CardDescription>
            Detalhes da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile?.email || user?.email || ''}
              readOnly
              className="bg-muted"
            />
          </div>
          
          <div>
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              type="text"
              value={profile?.full_name || ''}
              readOnly
              className="bg-muted"
              placeholder="Não informado"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}