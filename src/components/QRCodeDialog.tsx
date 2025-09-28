import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, RefreshCw, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppActions } from '@/hooks/useWhatsAppActions';

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
}

export function QRCodeDialog({ open, onOpenChange, sessionName }: QRCodeDialogProps) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();
  const { restartSession } = useWhatsAppActions();

  const fetchQRCode = async () => {
    if (!session?.access_token) {
      toast({
        title: 'Erro',
        description: 'Token de autenticação não disponível',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-whatsapp-qr', {
        body: { sessionName },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setQrData(data.qrData.data);
    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast({
        title: 'Erro ao buscar QR Code',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestartAndFetchQR = async () => {
    setRestarting(true);
    try {
      const result = await restartSession(sessionName);
      if (result.success) {
        toast({
          title: 'Sessão reiniciada',
          description: 'A sessão foi reiniciada com sucesso',
        });
        // Wait a moment for the session to be ready
        setTimeout(() => {
          fetchQRCode();
        }, 2000);
      } else {
        throw new Error(result.error || 'Erro ao reiniciar sessão');
      }
    } catch (error) {
      console.error('Error restarting session:', error);
      toast({
        title: 'Erro ao reiniciar sessão',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setRestarting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setQrData(null);
      handleRestartAndFetchQR();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code - {sessionName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {restarting ? (
            <div className="flex items-center justify-center p-8">
              <RotateCcw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Reiniciando sessão...</span>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando QR Code...</span>
            </div>
          ) : qrData ? (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-white">
                <img 
                  src={`data:image/png;base64,${qrData}`} 
                  alt="QR Code para conexão WhatsApp"
                  className="w-full h-auto max-w-xs mx-auto"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Escaneie este QR Code com o WhatsApp para conectar a sessão
              </p>
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  onClick={handleRestartAndFetchQR}
                  className="flex-1"
                  disabled={restarting}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reiniciar & QR
                </Button>
                <Button 
                  variant="outline" 
                  onClick={fetchQRCode}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar QR
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground">
                Não foi possível carregar o QR Code
              </p>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={handleRestartAndFetchQR}
                  disabled={restarting}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reiniciar Sessão
                </Button>
                <Button 
                  variant="outline" 
                  onClick={fetchQRCode}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}