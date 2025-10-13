import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useWhatsAppActions } from '@/hooks/useWhatsAppActions';
import { useChatwootLocales } from '@/hooks/useChatwootLocales';
import { useToast } from '@/hooks/use-toast';
import {
  ChatwootAppConfig,
  ChatwootConversationSort,
  ChatwootConversationStatus,
  WahaApp,
} from '@/types/waha';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';

interface SessionAppsDialogProps {
  session: {
    name: string;
    apps?: WahaApp[];
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppsUpdated: () => void;
}

interface ChatwootAppFormState {
  url: string;
  accountId: string;
  accountToken: string;
  inboxId: string;
  inboxIdentifier: string;
  locale: string;
  linkPreview: 'OFF' | 'LG' | 'HG';
  commandsServer: boolean;
  conversationsSort: ChatwootConversationSort;
  conversationsStatus: ChatwootConversationStatus[];
}

const STATUS_OPTIONS: { value: ChatwootConversationStatus; label: string }[] = [
  { value: 'open', label: 'Abertas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'snoozed', label: 'Soneca' },
  { value: 'resolved', label: 'Resolvidas' },
];

const SORT_OPTIONS: { value: ChatwootConversationSort; label: string }[] = [
  { value: 'activity_newest', label: 'Atividade (mais recente)' },
  { value: 'activity_oldest', label: 'Atividade (mais antiga)' },
  { value: 'created_newest', label: 'Criação (mais recente)' },
  { value: 'created_oldest', label: 'Criação (mais antiga)' },
];

const LINK_PREVIEW_OPTIONS: { value: 'OFF' | 'LG' | 'HG'; label: string }[] = [
  { value: 'OFF', label: 'Desativado' },
  { value: 'LG', label: 'Link Preview (LG)' },
  { value: 'HG', label: 'Link Preview (HG)' },
];

const DEFAULT_CHATWOOT_STATE: ChatwootAppFormState = {
  url: '',
  accountId: '',
  accountToken: '',
  inboxId: '',
  inboxIdentifier: '',
  locale: 'en-US',
  linkPreview: 'OFF',
  commandsServer: true,
  conversationsSort: 'activity_newest',
  conversationsStatus: ['open', 'pending', 'snoozed', 'resolved'],
};

export const SessionAppsDialog = ({
  session,
  open,
  onOpenChange,
  onAppsUpdated,
}: SessionAppsDialogProps) => {
  const { createApp, updateApp, deleteApp, loading } = useWhatsAppActions();
  const { toast } = useToast();
  const { locales, loading: localesLoading, error: localesError, fetchLocales } = useChatwootLocales();

  const [chatwootEnabled, setChatwootEnabled] = useState(false);
  const [chatwootForm, setChatwootForm] = useState<ChatwootAppFormState>(DEFAULT_CHATWOOT_STATE);
  const [chatwootAppId, setChatwootAppId] = useState<string | null>(null);

  const chatwootApp = useMemo<WahaApp<ChatwootAppConfig> | null>(() => {
    if (!session?.apps) return null;
    const found = session.apps.find((app) => app.app === 'chatwoot');
    return found ? (found as WahaApp<ChatwootAppConfig>) : null;
  }, [session]);

  useEffect(() => {
    if (open) {
      fetchLocales();
    }
  }, [open, fetchLocales]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (chatwootApp) {
      const config = chatwootApp.config || ({} as Partial<ChatwootAppConfig>);
      setChatwootAppId(chatwootApp.id);
      setChatwootEnabled(chatwootApp.enabled !== false);
      setChatwootForm({
        url: String(config.url ?? ''),
        accountId: config.accountId !== undefined ? String(config.accountId) : '',
        accountToken: String(config.accountToken ?? ''),
        inboxId: config.inboxId !== undefined ? String(config.inboxId) : '',
        inboxIdentifier: String(config.inboxIdentifier ?? ''),
        locale: String(config.locale ?? 'en-US'),
        linkPreview: (config.linkPreview as 'OFF' | 'LG' | 'HG') ?? 'OFF',
        commandsServer: config.commands?.server ?? true,
        conversationsSort: config.conversations?.sort ?? 'activity_newest',
        conversationsStatus: config.conversations?.status ?? ['open', 'pending', 'snoozed', 'resolved'],
      });
    } else {
      setChatwootAppId(null);
      setChatwootEnabled(false);
      setChatwootForm(DEFAULT_CHATWOOT_STATE);
    }
  }, [chatwootApp, open]);

  const handleFieldChange = (field: keyof ChatwootAppFormState, value: string | boolean | ChatwootConversationStatus[]) => {
    setChatwootForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleConversationStatus = (status: ChatwootConversationStatus) => {
    setChatwootForm((prev) => {
      const exists = prev.conversationsStatus.includes(status);
      const updated = exists
        ? prev.conversationsStatus.filter((item) => item !== status)
        : [...prev.conversationsStatus, status];

      return {
        ...prev,
        conversationsStatus: updated,
      };
    });
  };

  const validateChatwootForm = () => {
    const errors: string[] = [];

    const requiredFields: Array<{ field: keyof ChatwootAppFormState; label: string }> = [
      { field: 'url', label: 'URL' },
      { field: 'accountId', label: 'Account ID' },
      { field: 'accountToken', label: 'Account Token' },
      { field: 'inboxId', label: 'Inbox ID' },
      { field: 'inboxIdentifier', label: 'Inbox Identifier' },
      { field: 'locale', label: 'Locale' },
    ];

    for (const { field, label } of requiredFields) {
      const value = chatwootForm[field];
      if (typeof value === 'string' && value.trim() === '') {
        errors.push(`Campo ${label} é obrigatório`);
      }
    }

    const numericFields: Array<{ field: Extract<keyof ChatwootAppFormState, 'accountId' | 'inboxId'>; label: string }> = [
      { field: 'accountId', label: 'Account ID' },
      { field: 'inboxId', label: 'Inbox ID' },
    ];

    for (const { field, label } of numericFields) {
      const parsed = Number(chatwootForm[field]);
      if (Number.isNaN(parsed) || parsed < 0) {
        errors.push(`Campo ${label} deve ser um número válido`);
      }
    }

    return errors;
  };

  const buildChatwootConfig = (): ChatwootAppConfig => ({
    url: chatwootForm.url.trim(),
    accountId: Number(chatwootForm.accountId),
    accountToken: chatwootForm.accountToken.trim(),
    inboxId: Number(chatwootForm.inboxId),
    inboxIdentifier: chatwootForm.inboxIdentifier.trim(),
    locale: chatwootForm.locale,
    linkPreview: chatwootForm.linkPreview,
    commands: {
      server: chatwootForm.commandsServer,
    },
    conversations: {
      sort: chatwootForm.conversationsSort,
      status: chatwootForm.conversationsStatus.length > 0 ? chatwootForm.conversationsStatus : null,
    },
  });

  const handleSave = async () => {
    if (!session) {
      return;
    }

    if (!chatwootEnabled && !chatwootAppId) {
      toast({
        title: 'Nenhuma alteração',
        description: 'Ative a integração para configurar o app.',
      });
      return;
    }

    if (chatwootEnabled) {
      const validationErrors = validateChatwootForm();
      if (validationErrors.length > 0) {
        toast({
          title: 'Erros de validação',
          description: validationErrors.join('\n'),
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      if (chatwootAppId) {
        const result = await updateApp({
          id: chatwootAppId,
          session: session.name,
          app: 'chatwoot',
          enabled: chatwootEnabled,
          config: buildChatwootConfig(),
        });

        if (!result.success) {
          throw new Error(result.error || 'Falha ao atualizar app');
        }

        toast({
          title: 'Integração atualizada',
          description: 'Configurações do Chatwoot foram salvas.',
        });

        if (result.app) {
          setChatwootAppId(result.app.id);
          setChatwootEnabled(result.app.enabled !== false);
        }
      } else {
        const result = await createApp({
          session: session.name,
          app: 'chatwoot',
          enabled: chatwootEnabled,
          config: buildChatwootConfig(),
        });

        if (!result.success || !result.app) {
          throw new Error(result.error || 'Falha ao criar app');
        }

        toast({
          title: 'Integração criada',
          description: 'Chatwoot configurado com sucesso.',
        });

        setChatwootAppId(result.app.id);
        setChatwootEnabled(result.app.enabled !== false);
      }

      onAppsUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar integração';
      toast({
        title: 'Erro ao salvar',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!session || !chatwootAppId) {
      return;
    }

    if (!confirm('Tem certeza que deseja remover a integração Chatwoot desta sessão?')) {
      return;
    }

    try {
      const result = await deleteApp({
        id: chatwootAppId,
        session: session.name,
      });

      if (!result.success) {
        throw new Error(result.error || 'Falha ao deletar app');
      }

      toast({
        title: 'Integração removida',
        description: 'Chatwoot foi removido da sessão.',
      });

      setChatwootAppId(null);
      setChatwootEnabled(false);
      setChatwootForm(DEFAULT_CHATWOOT_STATE);
      onAppsUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao remover integração';
      toast({
        title: 'Erro ao remover',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const renderLocalesSelect = () => {
    const options = locales.length > 0
      ? locales
      : [{ code: 'en-US', name: 'English (en-US)' }];

    return (
      <Select
        value={chatwootForm.locale}
        onValueChange={(value) => handleFieldChange('locale', value)}
        disabled={!chatwootEnabled || localesLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione o idioma" />
        </SelectTrigger>
        <SelectContent>
          {options.map((locale) => {
            const value = String(locale.code ?? locale.locale ?? 'en-US');
            const label = String(locale.name ?? locale.nativeName ?? value);
            return (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Apps da Sessão</DialogTitle>
          <DialogDescription>
            Configure integrações adicionais para a sessão {session?.name ?? ''}.
          </DialogDescription>
        </DialogHeader>

        {!session ? (
          <p className="text-sm text-muted-foreground">
            Selecione uma sessão para configurar os apps.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Chatwoot</h3>
                <p className="text-sm text-muted-foreground">
                  Envie e sincronize conversas do WhatsApp com o Chatwoot.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="chatwoot-enabled"
                  checked={chatwootEnabled}
                  onCheckedChange={(checked) => setChatwootEnabled(Boolean(checked))}
                />
                <Label htmlFor="chatwoot-enabled">
                  {chatwootEnabled ? 'Integração ativa' : 'Integração inativa'}
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chatwoot-url">URL do Chatwoot *</Label>
                <Input
                  id="chatwoot-url"
                  placeholder="https://meu-chatwoot.com"
                  value={chatwootForm.url}
                  onChange={(event) => handleFieldChange('url', event.target.value)}
                  disabled={!chatwootEnabled || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatwoot-locale">Idioma *</Label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    {renderLocalesSelect()}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fetchLocales()}
                    disabled={localesLoading}
                    title="Atualizar idiomas"
                  >
                    {localesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
                {localesError && (
                  <p className="text-xs text-red-500">{localesError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatwoot-account-id">Account ID *</Label>
                <Input
                  id="chatwoot-account-id"
                  type="number"
                  min={0}
                  value={chatwootForm.accountId}
                  onChange={(event) => handleFieldChange('accountId', event.target.value)}
                  disabled={!chatwootEnabled || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatwoot-account-token">Account Token *</Label>
                <Input
                  id="chatwoot-account-token"
                  type="password"
                  value={chatwootForm.accountToken}
                  onChange={(event) => handleFieldChange('accountToken', event.target.value)}
                  disabled={!chatwootEnabled || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatwoot-inbox-id">Inbox ID *</Label>
                <Input
                  id="chatwoot-inbox-id"
                  type="number"
                  min={0}
                  value={chatwootForm.inboxId}
                  onChange={(event) => handleFieldChange('inboxId', event.target.value)}
                  disabled={!chatwootEnabled || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatwoot-inbox-identifier">Inbox Identifier *</Label>
                <Input
                  id="chatwoot-inbox-identifier"
                  value={chatwootForm.inboxIdentifier}
                  onChange={(event) => handleFieldChange('inboxIdentifier', event.target.value)}
                  disabled={!chatwootEnabled || loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Link Preview</Label>
                <Select
                  value={chatwootForm.linkPreview}
                  onValueChange={(value: 'OFF' | 'LG' | 'HG') => handleFieldChange('linkPreview', value)}
                  disabled={!chatwootEnabled || loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINK_PREVIEW_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ordenação das conversas</Label>
                <Select
                  value={chatwootForm.conversationsSort}
                  onValueChange={(value: ChatwootConversationSort) => handleFieldChange('conversationsSort', value)}
                  disabled={!chatwootEnabled || loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Estados das conversas</Label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((option) => {
                  const checked = chatwootForm.conversationsStatus.includes(option.value);
                  return (
                    <label key={option.value} className="flex items-center space-x-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleConversationStatus(option.value)}
                        disabled={!chatwootEnabled || loading}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Se nenhum estado for selecionado, o Chatwoot considerará todas as conversas.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="chatwoot-commands-server"
                checked={chatwootForm.commandsServer}
                onCheckedChange={(checked) => handleFieldChange('commandsServer', Boolean(checked))}
                disabled={!chatwootEnabled || loading}
              />
              <Label htmlFor="chatwoot-commands-server">
                Ativar comandos do Chatwoot no servidor
              </Label>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2">
            {chatwootAppId && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remover Chatwoot
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading || !session}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar Configurações
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
