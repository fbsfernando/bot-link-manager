import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWhatsAppActions } from '@/hooks/useWhatsAppActions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated: () => void;
}

export const CreateSessionDialog = ({ open, onOpenChange, onSessionCreated }: CreateSessionDialogProps) => {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [start, setStart] = useState(true);
  const [debug, setDebug] = useState(false);
  
  // Proxy settings
  const [proxyServer, setProxyServer] = useState('');
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  
  // Webhook settings
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookKey, setWebhookKey] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('');

  const { createSession, loading } = useWhatsAppActions();
  const { toast } = useToast();

  // Validate session name
  const validateSessionName = (value: string) => {
    const trimmedValue = value.trim();
    
    if (!trimmedValue) {
      setNameError('Nome é obrigatório');
      return false;
    }
    
    // Only allow alphanumeric characters, hyphens, and underscores
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(trimmedValue)) {
      setNameError('Nome pode conter apenas letras, números, hífens (-) e underscores (_)');
      return false;
    }
    
    if (trimmedValue.length < 2) {
      setNameError('Nome deve ter pelo menos 2 caracteres');
      return false;
    }
    
    if (trimmedValue.length > 30) {
      setNameError('Nome deve ter no máximo 30 caracteres');
      return false;
    }
    
    setNameError('');
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    
    if (value.trim()) {
      validateSessionName(value);
    } else {
      setNameError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate session name before submission
    if (!validateSessionName(name)) {
      return;
    }

    const sessionData: any = {
      name: name.trim(),
      start,
      config: {
        debug,
      }
    };

    // Add proxy if configured
    if (proxyServer.trim()) {
      sessionData.config.proxy = {
        server: proxyServer.trim(),
        ...(proxyUsername.trim() && { username: proxyUsername.trim() }),
        ...(proxyPassword.trim() && { password: proxyPassword.trim() }),
      };
    }

    // Add webhook if configured
    if (webhookUrl.trim()) {
      const events = webhookEvents.trim() ? webhookEvents.split(',').map(e => e.trim()) : [];
      sessionData.config.webhooks = [{
        url: webhookUrl.trim(),
        events,
        ...(webhookKey.trim() && { 
          hmac: { key: webhookKey.trim() } 
        }),
        retries: {
          delaySeconds: 2,
          attempts: 15,
          policy: "linear"
        }
      }];
    }

    const result = await createSession(sessionData);

    if (result.success) {
      toast({
        title: "Sessão criada",
        description: `Sessão "${name}" foi criada com sucesso`,
      });
      
      // Reset form
      setName('');
      setNameError('');
      setStart(true);
      setDebug(false);
      setProxyServer('');
      setProxyUsername('');
      setProxyPassword('');
      setWebhookUrl('');
      setWebhookKey('');
      setWebhookEvents('');
      
      onOpenChange(false);
      onSessionCreated();
    } else {
      toast({
        title: "Erro ao criar sessão",
        description: result.error || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nova Sessão WhatsApp</DialogTitle>
          <DialogDescription>
            Configure uma nova sessão para conectar ao WhatsApp
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="proxy">Proxy</TabsTrigger>
              <TabsTrigger value="webhook">Webhook</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Sessão *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={handleNameChange}
                    placeholder="Ex: sessao01, principal, teste_bot"
                    required
                    className={nameError ? "border-red-500" : ""}
                  />
                  {nameError && (
                    <p className="text-xs text-red-500 mt-1">{nameError}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Apenas letras, números, hífens (-) e underscores (_)
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="start"
                    checked={start}
                    onCheckedChange={setStart}
                  />
                  <Label htmlFor="start">Iniciar automaticamente</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="debug"
                    checked={debug}
                    onCheckedChange={setDebug}
                  />
                  <Label htmlFor="debug">Modo Debug</Label>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="proxy" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="proxy-server">Servidor Proxy</Label>
                  <Input
                    id="proxy-server"
                    value={proxyServer}
                    onChange={(e) => setProxyServer(e.target.value)}
                    placeholder="localhost:3128"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="proxy-username">Usuário</Label>
                    <Input
                      id="proxy-username"
                      value={proxyUsername}
                      onChange={(e) => setProxyUsername(e.target.value)}
                      placeholder="usuário"
                    />
                  </div>
                  <div>
                    <Label htmlFor="proxy-password">Senha</Label>
                    <Input
                      id="proxy-password"
                      type="password"
                      value={proxyPassword}
                      onChange={(e) => setProxyPassword(e.target.value)}
                      placeholder="senha"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="webhook" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="webhook-url">URL do Webhook</Label>
                  <Input
                    id="webhook-url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://webhook.site/xxx"
                  />
                </div>
                
                <div>
                  <Label htmlFor="webhook-key">Chave HMAC</Label>
                  <Input
                    id="webhook-key"
                    value={webhookKey}
                    onChange={(e) => setWebhookKey(e.target.value)}
                    placeholder="your-secret-key"
                  />
                </div>
                
                <div>
                  <Label htmlFor="webhook-events">Eventos (separados por vírgula)</Label>
                  <Textarea
                    id="webhook-events"
                    value={webhookEvents}
                    onChange={(e) => setWebhookEvents(e.target.value)}
                    placeholder="message, status, connection"
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !!nameError}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Sessão'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};