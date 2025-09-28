import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useWhatsAppSessions } from '@/hooks/useWhatsAppSessions';
import { useWhatsAppActions } from '@/hooks/useWhatsAppActions';
import { EditSessionDialog } from '@/components/EditSessionDialog';
import { QRCodeDialog } from '@/components/QRCodeDialog';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Settings,
  Loader2,
  QrCode,
  Play,
  Pause,
  LogOut,
  Trash2
} from 'lucide-react';

// Type for session compatible with edit dialog
interface SessionForEdit {
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

interface WhatsAppSessionStatusProps {
  className?: string;
}

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case 'CONNECTED':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'CONNECTING':
    case 'STARTING':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'SCAN_QR_CODE':
      return <AlertCircle className="h-4 w-4 text-blue-500" />;
    case 'DISCONNECTED':
    case 'ERROR':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'CONNECTED':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'CONNECTING':
    case 'STARTING':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'SCAN_QR_CODE':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'DISCONNECTED':
    case 'ERROR':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

export function WhatsAppSessionStatus({ className }: WhatsAppSessionStatusProps) {
  const { sessions, loading, error, refetch } = useWhatsAppSessions();
  const { restartSession, deleteSession, logoutSession, stopSession, loading: actionLoading } = useWhatsAppActions();
  const { toast } = useToast();
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [editingSession, setEditingSession] = useState<SessionForEdit | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedSessionForQR, setSelectedSessionForQR] = useState<string>('');

  const toggleExpanded = (sessionName: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionName)) {
      newExpanded.delete(sessionName);
    } else {
      newExpanded.add(sessionName);
    }
    setExpandedSessions(newExpanded);
  };

  const handleEditSession = (session: any) => {
    // Convert session to compatible format
    const sessionForEdit: SessionForEdit = {
      name: session.name,
      status: session.status,
      config: {
        ...session.config,
        webhooks: session.config?.webhooks?.map((webhook: any) => ({
          url: webhook.url,
          events: webhook.events || [],
          ...(webhook.hmac && typeof webhook.hmac === 'string' ? 
            { hmac: { key: webhook.hmac } } : 
            webhook.hmac ? { hmac: webhook.hmac } : {}
          ),
          ...(webhook.retries && typeof webhook.retries === 'number' ? 
            { retries: { delaySeconds: webhook.retries, attempts: 15, policy: 'linear' } } : 
            webhook.retries ? { retries: webhook.retries } : {}
          ),
          customHeaders: webhook.customHeaders || []
        })) || []
      }
    };
    setEditingSession(sessionForEdit);
    setShowEditDialog(true);
  };

  const handleSessionUpdated = () => {
    refetch();
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleShowQR = (sessionName: string) => {
    setSelectedSessionForQR(sessionName);
    setShowQRDialog(true);
  };

  const handleRestartSession = async (sessionName: string) => {
    try {
      const result = await restartSession(sessionName);
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: `Sessão ${sessionName} reiniciada com sucesso!`,
        });
        refetch();
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao reiniciar sessão',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao reiniciar sessão',
        variant: 'destructive',
      });
    }
  };

  const handleStopSession = async (sessionName: string) => {
    try {
      const result = await stopSession(sessionName);
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: `Sessão ${sessionName} pausada com sucesso!`,
        });
        refetch();
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao pausar sessão',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao pausar sessão',
        variant: 'destructive',
      });
    }
  };

  const handleLogoutSession = async (sessionName: string) => {
    try {
      const result = await logoutSession(sessionName);
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: `Sessão ${sessionName} desconectada com sucesso!`,
        });
        refetch();
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao desconectar sessão',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao desconectar sessão',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSession = async (sessionName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a sessão ${sessionName}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const result = await deleteSession(sessionName);
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: `Sessão ${sessionName} deletada com sucesso!`,
        });
        refetch();
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao deletar sessão',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao deletar sessão',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Status das Sessões WhatsApp
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading || actionLoading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Atualizar
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              {error}
            </div>
          )}

          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Carregando sessões...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma sessão encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Collapsible
                  key={session.name}
                  open={expandedSessions.has(session.name)}
                  onOpenChange={() => toggleExpanded(session.name)}
                >
                  <Card className="border-2">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(session.status)}
                            <div>
                              <h3 className="font-semibold">{session.name}</h3>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getStatusColor(session.status)}`}
                              >
                                {session.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowQR(session.name);
                              }}
                              className="flex items-center gap-2"
                            >
                              <QrCode className="h-4 w-4" />
                              QR Code
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSession(session);
                              }}
                              className="flex items-center gap-2"
                              disabled={actionLoading}
                            >
                              <Settings className="h-4 w-4" />
                              Configurar
                            </Button>
                            
                            {/* Action Buttons */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestartSession(session.name);
                              }}
                              className="flex items-center gap-1"
                              disabled={actionLoading}
                            >
                              <Play className="h-3 w-3" />
                              Reiniciar
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStopSession(session.name);
                              }}
                              className="flex items-center gap-1"
                              disabled={actionLoading}
                            >
                              <Pause className="h-3 w-3" />
                              Pausar
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLogoutSession(session.name);
                              }}
                              className="flex items-center gap-1"
                              disabled={actionLoading}
                            >
                              <LogOut className="h-3 w-3" />
                              Desconectar
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.name);
                              }}
                              className="flex items-center gap-1"
                              disabled={actionLoading}
                            >
                              <Trash2 className="h-3 w-3" />
                              Deletar
                            </Button>
                            
                            {expandedSessions.has(session.name) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-4">
                        {session.config?.debug !== undefined && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              Modo Debug
                            </p>
                            <Badge variant={session.config.debug ? "default" : "secondary"}>
                              {session.config.debug ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        )}

                        {session.config?.proxy && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                              Configuração de Proxy
                            </p>
                            <div className="bg-muted p-3 rounded space-y-1">
                              <p className="text-sm">
                                <span className="font-medium">Servidor:</span> {session.config.proxy.server}
                              </p>
                              {session.config.proxy.username && (
                                <p className="text-sm">
                                  <span className="font-medium">Usuário:</span> {session.config.proxy.username}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {session.config?.webhooks && session.config.webhooks.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                              Webhooks ({session.config.webhooks.length})
                            </p>
                            <div className="space-y-2">
                              {session.config.webhooks.slice(0, 3).map((webhook, idx) => (
                                <div key={idx} className="bg-muted p-2 rounded">
                                  <p className="text-sm font-mono break-all">
                                    {webhook.url}
                                  </p>
                                  {webhook.events && webhook.events.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Eventos: {webhook.events.join(', ')}
                                    </p>
                                  )}
                                </div>
                              ))}
                              {session.config.webhooks.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{session.config.webhooks.length - 3} webhook(s) adicional(is)
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {session.config?.metadata && Object.keys(session.config.metadata).length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                              Metadados
                            </p>
                            <div className="bg-muted p-3 rounded space-y-1">
                              {Object.entries(session.config.metadata).map(([key, value]) => (
                                <p key={key} className="text-sm">
                                  <span className="font-medium">{key}:</span> {String(value)}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditSessionDialog
        session={editingSession}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSessionUpdated={handleSessionUpdated}
      />
      
      <QRCodeDialog 
        open={showQRDialog}
        onOpenChange={setShowQRDialog}
        sessionName={selectedSessionForQR}
      />
    </div>
  );
};