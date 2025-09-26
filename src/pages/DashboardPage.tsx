import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, 
  Plus, 
  Zap, 
  Clock, 
  CheckCircle, 
  XCircle,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  QrCode,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface WhatsAppConnection {
  id: string;
  name: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'paused' | 'error';
  api_key: string | null;
  last_connected_at: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  max_connections: number;
  full_name: string | null;
}

export const DashboardPage = () => {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch connections
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

  const getStatusBadge = (status: string) => {
    const statusMap = {
      connected: { label: 'Conectado', variant: 'default' as const, icon: CheckCircle },
      connecting: { label: 'Conectando', variant: 'secondary' as const, icon: Clock },
      disconnected: { label: 'Desconectado', variant: 'outline' as const, icon: XCircle },
      paused: { label: 'Pausado', variant: 'secondary' as const, icon: PauseCircle },
      error: { label: 'Erro', variant: 'destructive' as const, icon: XCircle },
    };
    
    const status_info = statusMap[status as keyof typeof statusMap] || statusMap.disconnected;
    const Icon = status_info.icon;
    
    return (
      <Badge variant={status_info.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status_info.label}
      </Badge>
    );
  };

  const handleQuickAction = async (connectionId: string, action: string) => {
    toast({
      title: "Ação executada",
      description: `${action} realizada para a conexão`,
    });
  };

  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const maxConnections = profile?.max_connections || 5;
  const usagePercentage = (connections.length / maxConnections) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta, {profile?.full_name || user?.email}
          </p>
        </div>
        <Button 
          variant="neon" 
          onClick={() => window.location.href = '/connections'}
          disabled={connections.length >= maxConnections}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Conexão
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Conexões</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{connections.length}</div>
            <p className="text-xs text-muted-foreground">
              de {maxConnections} disponíveis
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conexões Ativas</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-green">{connectedCount}</div>
            <p className="text-xs text-muted-foreground">
              operando normalmente
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uso do Plano</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usagePercentage.toFixed(0)}%</div>
            <Progress value={usagePercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {connectedCount > 0 ? 'Operacional' : 'Inativo'}
            </div>
            <p className="text-xs text-muted-foreground">
              última atualização agora
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connections Overview */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conexões WhatsApp
          </CardTitle>
          <CardDescription>
            Gerencie suas conexões ativas do WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">Nenhuma conexão</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece criando sua primeira conexão WhatsApp
              </p>
              <div className="mt-6">
                <Button variant="neon" onClick={() => window.location.href = '/connections'}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Conexão
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{connection.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {connection.api_key ? 'API configurada' : 'API não configurada'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusBadge(connection.status)}
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleQuickAction(connection.id, 'QR Code')}
                        className="h-8 w-8 p-0"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleQuickAction(connection.id, 'Pareamento')}
                        className="h-8 w-8 p-0"
                      >
                        <Smartphone className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleQuickAction(connection.id, 'Reiniciar')}
                        className="h-8 w-8 p-0"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};