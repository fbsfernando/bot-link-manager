import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWhatsAppActions } from '@/hooks/useWhatsAppActions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, X } from 'lucide-react';

interface WhatsAppSession {
  name: string;
  status: string;
  config: {
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

interface EditSessionDialogProps {
  session: WhatsAppSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionUpdated: () => void;
}

export function EditSessionDialog({
  session,
  open,
  onOpenChange,
  onSessionUpdated,
}: EditSessionDialogProps) {
  const { updateSession, loading } = useWhatsAppActions();
  const { toast } = useToast();
  
  // Form state
  const [debug, setDebug] = useState(false);
  const [proxyServer, setProxyServer] = useState('');
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [webhooks, setWebhooks] = useState<Array<{
    url: string;
    events: string[];
    hmac?: { key: string };
    retries?: { delaySeconds: number; attempts: number; policy: string };
    customHeaders?: Array<{ name: string; value: string }>;
  }>>([]);
  const [metadata, setMetadata] = useState<Array<{ key: string; value: string }>>([]);

  // Initialize form with session data
  useEffect(() => {
    if (session && open) {
      setDebug(session.config.debug || false);
      setProxyServer(session.config.proxy?.server || '');
      setProxyUsername(session.config.proxy?.username || '');
      setProxyPassword(session.config.proxy?.password || '');
      setWebhooks(session.config.webhooks || []);
      
      // Convert metadata object to array for editing
      const metadataArray = Object.entries(session.config.metadata || {}).map(([key, value]) => ({
        key,
        value: String(value)
      }));
      setMetadata(metadataArray);
    }
  }, [session, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) return;

    // Build config object
    const config: any = {
      debug,
    };

    // Add proxy if configured
    if (proxyServer) {
      config.proxy = {
        server: proxyServer,
        ...(proxyUsername && { username: proxyUsername }),
        ...(proxyPassword && { password: proxyPassword }),
      };
    }

    // Add webhooks if any
    if (webhooks.length > 0) {
      config.webhooks = webhooks;
    }

    // Convert metadata array back to object
    if (metadata.length > 0) {
      config.metadata = metadata.reduce((acc, { key, value }) => {
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);
    }

    try {
      const result = await updateSession({
        sessionName: session.name,
        config,
      });

      if (result.success) {
        toast({
          title: 'Sucesso',
          description: `Configurações da sessão ${session.name} atualizadas com sucesso!`,
        });
        onSessionUpdated();
        onOpenChange(false);
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao atualizar configurações da sessão',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao atualizar sessão',
        variant: 'destructive',
      });
    }
  };

  const addWebhook = () => {
    setWebhooks([
      ...webhooks,
      {
        url: '',
        events: [],
        retries: { delaySeconds: 2, attempts: 15, policy: 'linear' }
      }
    ]);
  };

  const removeWebhook = (index: number) => {
    setWebhooks(webhooks.filter((_, i) => i !== index));
  };

  const updateWebhook = (index: number, field: string, value: any) => {
    const updated = [...webhooks];
    updated[index] = { ...updated[index], [field]: value };
    setWebhooks(updated);
  };

  const addMetadata = () => {
    setMetadata([...metadata, { key: '', value: '' }]);
  };

  const removeMetadata = (index: number) => {
    setMetadata(metadata.filter((_, i) => i !== index));
  };

  const updateMetadata = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...metadata];
    updated[index] = { ...updated[index], [field]: value };
    setMetadata(updated);
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Sessão: {session.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="proxy">Proxy</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              <TabsTrigger value="metadata">Metadados</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="debug"
                  checked={debug}
                  onCheckedChange={setDebug}
                />
                <Label htmlFor="debug">Modo Debug</Label>
              </div>
            </TabsContent>

            <TabsContent value="proxy" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="proxyServer">Servidor Proxy</Label>
                  <Input
                    id="proxyServer"
                    value={proxyServer}
                    onChange={(e) => setProxyServer(e.target.value)}
                    placeholder="localhost:3128"
                  />
                </div>
                <div>
                  <Label htmlFor="proxyUsername">Usuário</Label>
                  <Input
                    id="proxyUsername"
                    value={proxyUsername}
                    onChange={(e) => setProxyUsername(e.target.value)}
                    placeholder="username"
                  />
                </div>
                <div>
                  <Label htmlFor="proxyPassword">Senha</Label>
                  <Input
                    id="proxyPassword"
                    type="password"
                    value={proxyPassword}
                    onChange={(e) => setProxyPassword(e.target.value)}
                    placeholder="password"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="webhooks" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Webhooks</Label>
                  <Button type="button" onClick={addWebhook} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Webhook
                  </Button>
                </div>
                
                {webhooks.map((webhook, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Webhook {index + 1}</Label>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeWebhook(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={webhook.url}
                        onChange={(e) => updateWebhook(index, 'url', e.target.value)}
                        placeholder="https://webhook.site/your-endpoint"
                      />
                    </div>
                    
                    <div>
                      <Label>Eventos (separados por vírgula)</Label>
                      <Input
                        value={webhook.events.join(', ')}
                        onChange={(e) => updateWebhook(index, 'events', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="message, session.status"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Metadados</Label>
                  <Button type="button" onClick={addMetadata} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Metadado
                  </Button>
                </div>
                
                {metadata.map((meta, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={meta.key}
                      onChange={(e) => updateMetadata(index, 'key', e.target.value)}
                      placeholder="chave"
                      className="flex-1"
                    />
                    <Input
                      value={meta.value}
                      onChange={(e) => updateMetadata(index, 'value', e.target.value)}
                      placeholder="valor"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeMetadata(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}