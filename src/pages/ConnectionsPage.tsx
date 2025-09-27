import { WhatsAppSessionStatus } from '@/components/WhatsAppSessionStatus';

export default function ConnectionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Conexões WhatsApp</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas sessões ativas do WhatsApp através da API WAHA
        </p>
      </div>

      <WhatsAppSessionStatus />
    </div>
  );
}