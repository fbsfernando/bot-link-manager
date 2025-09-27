import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useWhatsAppSessions, WhatsAppSession } from '@/hooks/useWhatsAppSessions';
import { RefreshCw, Loader2, AlertCircle, CheckCircle2, Clock, XCircle, Settings } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

export const WhatsAppSessionStatus = ({ className }: WhatsAppSessionStatusProps) => {
  const { sessions, loading, error, refetch } = useWhatsAppSessions();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-foreground">
              Sessões Ativas da API WAHA
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-500 text-sm">{error}</span>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando sessões...</span>
            </div>
          )}

          {!loading && !error && sessions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma sessão encontrada para este usuário</p>
            </div>
          )}

          {!loading && sessions.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-3">
                Encontradas {sessions.length} sessão(ões) ativa(s)
              </p>
              
              {sessions.map((session, index) => (
                <Collapsible
                  key={`${session.name}-${index}`}
                  open={expandedSession === `${session.name}-${index}`}
                  onOpenChange={(open) => 
                    setExpandedSession(open ? `${session.name}-${index}` : null)
                  }
                >
                  <CollapsibleTrigger asChild>
                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(session.status)}
                            <div>
                              <h4 className="font-medium text-foreground">
                                {session.name}
                              </h4>
                              {session.me && (
                                <p className="text-sm text-muted-foreground">
                                  {session.me.pushName} ({session.me.id})
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                            <Settings className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <Card className="mt-2 border-l-4 border-l-primary/30">
                      <CardContent className="p-4 space-y-3">
                        {session.assignedWorker && (
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">
                              Worker Atribuído
                            </Label>
                            <p className="text-sm font-mono">{session.assignedWorker}</p>
                          </div>
                        )}

                        {session.config?.debug !== undefined && (
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">
                              Modo Debug
                            </Label>
                            <p className="text-sm">
                              {session.config.debug ? 'Ativado' : 'Desativado'}
                            </p>
                          </div>
                        )}

                        {session.config?.proxy && (
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">
                              Proxy
                            </Label>
                            <p className="text-sm font-mono">{session.config.proxy.server}</p>
                            {session.config.proxy.username && (
                              <p className="text-xs text-muted-foreground">
                                Usuário: {session.config.proxy.username}
                              </p>
                            )}
                          </div>
                        )}

                        {session.config?.webhooks && session.config.webhooks.length > 0 && (
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">
                              Webhooks ({session.config.webhooks.length})
                            </Label>
                            <div className="space-y-1">
                              {session.config.webhooks.map((webhook, idx) => (
                                <p key={idx} className="text-sm font-mono break-all">
                                  {webhook.url}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {session.config?.metadata && (
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">
                              Metadados
                            </Label>
                            <div className="text-sm space-y-1">
                              {session.config.metadata["user.id"] && (
                                <p>ID do Usuário: {session.config.metadata["user.id"]}</p>
                              )}
                              {session.config.metadata["user.email"] && (
                                <p>Email: {session.config.metadata["user.email"]}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};