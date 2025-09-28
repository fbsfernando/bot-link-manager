import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WhatsAppSessionStatus } from '@/components/WhatsAppSessionStatus';
import { CreateSessionDialog } from '@/components/CreateSessionDialog';
import { useWhatsAppSessions } from '@/hooks/useWhatsAppSessions';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, AlertTriangle } from 'lucide-react';

export default function ConnectionsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [maxConnections, setMaxConnections] = useState(5);
  const { sessions } = useWhatsAppSessions();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserLimits();
    }
  }, [user]);

  const fetchUserLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('max_connections')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setMaxConnections(data?.max_connections || 5);
    } catch (error) {
      console.error('Error fetching user limits:', error);
    }
  };

  const handleSessionCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const canCreateNewSession = sessions.length < maxConnections;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conexões WhatsApp</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas sessões ativas do WhatsApp através da API WAHA
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">
              {sessions.length}/{maxConnections} sessões utilizadas
            </span>
            {!canCreateNewSession && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Limite atingido</span>
              </div>
            )}
          </div>
        </div>
        
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2"
          disabled={!canCreateNewSession}
          title={!canCreateNewSession ? `Você atingiu o limite do seu plano (${sessions.length}/${maxConnections})` : 'Criar nova sessão'}
        >
          <Plus className="h-4 w-4" />
          Nova Sessão
        </Button>
      </div>

      <WhatsAppSessionStatus key={refreshTrigger} />
      
      <CreateSessionDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
}