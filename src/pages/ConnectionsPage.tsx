import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Plus, 
  Settings, 
  Play,
  Pause,
  RotateCcw,
  QrCode,
  Smartphone,
  Webhook,
  Shield,
  Bug,
  Trash2,
  Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { WhatsAppSessionStatus } from '@/components/WhatsAppSessionStatus';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WhatsAppConnection {
  id: string;
  name: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'paused' | 'error';
  api_key: string | null;
  qr_code: string | null;
  pairing_code: string | null;
  webhook_url: string | null;
  proxy_host: string | null;
  proxy_port: number | null;
  proxy_username: string | null;
  proxy_password: string | null;
  debug_mode: boolean;
  allow_numbers: boolean;
  allow_status: boolean;
  allow_channels: boolean;
  last_connected_at: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  max_connections: number;
  full_name: string | null;
}

export const ConnectionsPage = () => {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<WhatsAppConnection | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newConnectionName, setNewConnectionName] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Buscar perfil do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Buscar conexões
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (connectionsError) throw connectionsError;
      setConnections(connectionsData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const createConnection = async () => {
    if (!newConnectionName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a conexão",
        variant: "destructive",
      });
      return;
    }

    // Verificar limite de conexões
    if (connections.length >= (profile?.max_connections || 5)) {
      toast({
        title: "Limite atingido",
        description: `Você já atingiu o limite de ${profile?.max_connections || 5} conexões`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .insert({
          user_id: user?.id,
          name: newConnectionName,
          status: 'disconnected',
        })
        .select()
        .single();

      if (error) throw error;

      setConnections([data, ...connections]);
      setNewConnectionName('');
      setShowCreateDialog(false);
      
      toast({
        title: "Conexão criada",
        description: "Nova conexão WhatsApp foi criada com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar conexão",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateConnection = async (connectionId: string, updates: Partial<WhatsAppConnection>) => {
    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .update(updates)
        .eq('id', connectionId);

      if (error) throw error;

      setConnections(connections.map(conn => 
        conn.id === connectionId ? { ...conn, ...updates } : conn
      ));

      if (selectedConnection?.id === connectionId) {
        setSelectedConnection({ ...selectedConnection, ...updates });
      }

      toast({
        title: "Configurações salvas",
        description: "As alterações foram salvas com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      setConnections(connections.filter(conn => conn.id !== connectionId));
      if (selectedConnection?.id === connectionId) {
        setSelectedConnection(null);
      }

      toast({
        title: "Conexão removida",
        description: "A conexão foi removida com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover conexão",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      connected: { label: 'Conectado', variant: 'default' as const },
      connecting: { label: 'Conectando', variant: 'secondary' as const },
      disconnected: { label: 'Desconectado', variant: 'outline' as const },
      paused: { label: 'Pausado', variant: 'secondary' as const },
      error: { label: 'Erro', variant: 'destructive' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.disconnected;
    
    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Carregando conexões...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Conexões WhatsApp</h1>
            <p className="text-muted-foreground">
              Gerencie suas conexões e configurações ({connections.length}/{profile?.max_connections || 5})
            </p>
          </div>
          <Button 
            variant="neon" 
            onClick={() => setShowCreateDialog(true)}
            disabled={connections.length >= (profile?.max_connections || 5)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Conexão
          </Button>
        </div>

        {/* API Session Status */}
        <WhatsAppSessionStatus className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connections List */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Suas Conexões
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedConnection?.id === connection.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-secondary/20'
                    }`}
                    onClick={() => setSelectedConnection(connection)}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{connection.name}</h4>
                      {getStatusBadge(connection.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {connection.api_key ? 'Configurado' : 'Não configurado'}
                    </p>
                  </div>
                ))}
                
                {connections.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nenhuma conexão criada
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Connection Details */}
          <div className="lg:col-span-2">
            {selectedConnection ? (
              <Card className="bg-gradient-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        {selectedConnection.name}
                      </CardTitle>
                      <CardDescription>
                        Configure sua conexão WhatsApp
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteConnection(selectedConnection.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="basic">Básico</TabsTrigger>
                      <TabsTrigger value="webhook">Webhook</TabsTrigger>
                      <TabsTrigger value="proxy">Proxy</TabsTrigger>
                      <TabsTrigger value="messages">Mensagens</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="api-key">Chave da API</Label>
                          <Input
                            id="api-key"
                            value={selectedConnection.api_key || ''}
                            onChange={(e) => 
                              updateConnection(selectedConnection.id, { api_key: e.target.value })
                            }
                            placeholder="Insira sua chave da API"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="debug-mode"
                            checked={selectedConnection.debug_mode}
                            onCheckedChange={(checked) =>
                              updateConnection(selectedConnection.id, { debug_mode: checked })
                            }
                          />
                          <Label htmlFor="debug-mode">Modo Debug</Label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <Button variant="connection">
                            <Play className="mr-2 h-4 w-4" />
                            Iniciar
                          </Button>
                          <Button variant="connection">
                            <Pause className="mr-2 h-4 w-4" />
                            Pausar
                          </Button>
                          <Button variant="connection">
                            <QrCode className="mr-2 h-4 w-4" />
                            QR Code
                          </Button>
                          <Button variant="connection">
                            <Smartphone className="mr-2 h-4 w-4" />
                            Pareamento
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="webhook" className="space-y-4">
                      <div>
                        <Label htmlFor="webhook-url">URL do Webhook</Label>
                        <Input
                          id="webhook-url"
                          value={selectedConnection.webhook_url || ''}
                          onChange={(e) =>
                            updateConnection(selectedConnection.id, { webhook_url: e.target.value })
                          }
                          placeholder="https://seu-webhook.com/api"
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="proxy" className="space-y-4">
                      <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="proxy-host">Host do Proxy</Label>
                            <Input
                              id="proxy-host"
                              value={selectedConnection.proxy_host || ''}
                              onChange={(e) =>
                                updateConnection(selectedConnection.id, { proxy_host: e.target.value })
                              }
                              placeholder="proxy.exemplo.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="proxy-port">Porta</Label>
                            <Input
                              id="proxy-port"
                              type="number"
                              value={selectedConnection.proxy_port || ''}
                              onChange={(e) =>
                                updateConnection(selectedConnection.id, { proxy_port: parseInt(e.target.value) || null })
                              }
                              placeholder="8080"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="proxy-username">Usuário</Label>
                            <Input
                              id="proxy-username"
                              value={selectedConnection.proxy_username || ''}
                              onChange={(e) =>
                                updateConnection(selectedConnection.id, { proxy_username: e.target.value })
                              }
                              placeholder="usuário"
                            />
                          </div>
                          <div>
                            <Label htmlFor="proxy-password">Senha</Label>
                            <Input
                              id="proxy-password"
                              type="password"
                              value={selectedConnection.proxy_password || ''}
                              onChange={(e) =>
                                updateConnection(selectedConnection.id, { proxy_password: e.target.value })
                              }
                              placeholder="senha"
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="messages" className="space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="allow-numbers"
                            checked={selectedConnection.allow_numbers}
                            onCheckedChange={(checked) =>
                              updateConnection(selectedConnection.id, { allow_numbers: checked })
                            }
                          />
                          <Label htmlFor="allow-numbers">Permitir mensagens de números</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="allow-status"
                            checked={selectedConnection.allow_status}
                            onCheckedChange={(checked) =>
                              updateConnection(selectedConnection.id, { allow_status: checked })
                            }
                          />
                          <Label htmlFor="allow-status">Permitir mensagens de status</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="allow-channels"
                            checked={selectedConnection.allow_channels}
                            onCheckedChange={(checked) =>
                              updateConnection(selectedConnection.id, { allow_channels: checked })
                            }
                          />
                          <Label htmlFor="allow-channels">Permitir mensagens de canais</Label>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-card border-border">
                <CardContent className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold text-foreground">
                      Selecione uma conexão
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Escolha uma conexão para ver suas configurações
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Create Connection Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
              <DialogDescription>
                Crie uma nova conexão para gerenciar suas mensagens do WhatsApp
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="connection-name">Nome da Conexão</Label>
                <Input
                  id="connection-name"
                  value={newConnectionName}
                  onChange={(e) => setNewConnectionName(e.target.value)}
                  placeholder="Ex: Atendimento Principal"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button variant="neon" onClick={createConnection}>
                Criar Conexão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};