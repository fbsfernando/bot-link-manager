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
  Smartphone,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWhatsAppSessions } from '@/hooks/useWhatsAppSessions';
import { useWhatsAppActions } from '@/hooks/useWhatsAppActions';

interface UserProfile {
  id: string;
  max_connections: number;
  full_name: string | null;
}

export const DashboardPage = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { sessions, loading: sessionsLoading, error: sessionsError, refetch } = useWhatsAppSessions();
  const { restartSession, loading: actionLoading } = useWhatsAppActions();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'CONNECTED': { label: 'Conectado', variant: 'default' as const, icon: CheckCircle },
      'CONNECTING': { label: 'Conectando', variant: 'secondary' as const, icon: Clock },
      'STARTING': { label: 'Iniciando', variant: 'secondary' as const, icon: Clock },
      'SCAN_QR_CODE': { label: 'Aguardando QR', variant: 'secondary' as const, icon: QrCode },
      'DISCONNECTED': { label: 'Desconectado', variant: 'outline' as const, icon: XCircle },
      'STOPPED': { label: 'Pausado', variant: 'secondary' as const, icon: PauseCircle },
      'FAILED': { label: 'Erro', variant: 'destructive' as const, icon: XCircle },
      'WORKING': { label: 'Funcionando', variant: 'default' as const, icon: CheckCircle },
    };
    
    const statusInfo = statusMap[status.toUpperCase() as keyof typeof statusMap] || statusMap.DISCONNECTED;
    const Icon = statusInfo.icon;
    
    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {statusInfo.label}
      </Badge>
    );
  };

  const handleQuickAction = async (sessionName: string, action: string) => {
    if (action === 'Reiniciar') {
      try {
        const result = await restartSession(sessionName);
        if (result.success) {
          toast({
            title: "Sucesso",
            description: `Sessão ${sessionName} reiniciada com sucesso!`,
          });
          refetch();
        } else {
          toast({
            title: "Erro",
            description: result.error || 'Falha ao reiniciar sessão',
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Erro",
          description: 'Erro inesperado ao reiniciar sessão',
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Ação executada",
        description: `${action} realizada para a sessão ${sessionName}`,
      });
    }
  };

  // Calculate metrics based on session status
  const connectedCount = sessions.filter(s => 
    ['CONNECTED', 'WORKING'].includes(s.status.toUpperCase())
  ).length;
  
  const waitingCount = sessions.filter(s => 
    ['SCAN_QR_CODE', 'STARTING', 'CONNECTING'].includes(s.status.toUpperCase())
  ).length;
  
  const pausedCount = sessions.filter(s => 
    ['STOPPED', 'PAUSED'].includes(s.status.toUpperCase())
  ).length;
  
  const errorCount = sessions.filter(s => 
    ['FAILED', 'ERROR'].includes(s.status.toUpperCase())
  ).length;
  
  const disconnectedCount = sessions.filter(s => 
    ['DISCONNECTED'].includes(s.status.toUpperCase())
  ).length;

  const maxConnections = profile?.max_connections || 5;
  const usagePercentage = (sessions.length / maxConnections) * 100;

  if (loading || sessionsLoading) {
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
          disabled={sessions.length >= maxConnections}
          title={sessions.length >= maxConnections ? `Limite atingido (${sessions.length}/${maxConnections})` : 'Criar nova conexão'}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Conexão
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Sessões</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{sessions.length}</div>
            <p className="text-xs text-muted-foreground">
              de {maxConnections} disponíveis
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{connectedCount}</div>
            <p className="text-xs text-muted-foreground">
              conectadas e funcionando
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <QrCode className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{waitingCount}</div>
            <p className="text-xs text-muted-foreground">
              aguardando QR ou iniciando
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
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pausadas</CardTitle>
            <PauseCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pausedCount}</div>
            <p className="text-xs text-muted-foreground">
              sessões pausadas/paradas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Erro</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{errorCount}</div>
            <p className="text-xs text-muted-foreground">
              sessões com falha
            </p>
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
          {sessionsError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {sessionsError}
            </div>
          )}
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              {sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'} encontrada{sessions.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={sessionsLoading || actionLoading}
              className="flex items-center gap-2"
            >
              {sessionsLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Atualizar
            </Button>
          </div>

          {sessions.length === 0 ? (
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
              {sessions.map((session) => (
                <div
                  key={session.name}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{session.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {session.me ? `Conectado como: ${session.me.pushName || session.me.id}` : 'Aguardando conexão'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusBadge(session.status)}
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.location.href = '/connections'}
                        className="h-8 w-8 p-0"
                        title="Ver QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.location.href = '/connections'}
                        className="h-8 w-8 p-0"
                        title="Gerenciar Sessão"
                      >
                        <Smartphone className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleQuickAction(session.name, 'Reiniciar')}
                        className="h-8 w-8 p-0"
                        disabled={actionLoading}
                        title="Reiniciar Sessão"
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

export default DashboardPage;