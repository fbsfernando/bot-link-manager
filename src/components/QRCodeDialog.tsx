import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
}

export function QRCodeDialog({ open, onOpenChange, sessionName }: QRCodeDialogProps) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();

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

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setQrData(null);
      fetchQRCode();
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
          {loading ? (
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
              <Button 
                variant="outline" 
                onClick={fetchQRCode}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar QR Code
              </Button>
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground">
                Não foi possível carregar o QR Code
              </p>
              <Button 
                variant="outline" 
                onClick={fetchQRCode}
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}