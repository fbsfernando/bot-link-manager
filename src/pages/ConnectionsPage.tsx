import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WhatsAppSessionStatus } from '@/components/WhatsAppSessionStatus';
import { CreateSessionDialog } from '@/components/CreateSessionDialog';
import { Plus } from 'lucide-react';

export default function ConnectionsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSessionCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conexões WhatsApp</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas sessões ativas do WhatsApp através da API WAHA
          </p>
        </div>
        
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2"
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