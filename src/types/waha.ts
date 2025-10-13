export type WahaAppType = 'chatwoot';

export interface ChatwootCommandsConfig {
  server: boolean;
}

export type ChatwootConversationSort =
  | 'activity_newest'
  | 'created_newest'
  | 'created_oldest'
  | 'activity_oldest';

export type ChatwootConversationStatus =
  | 'open'
  | 'pending'
  | 'snoozed'
  | 'resolved';

export interface ChatwootConversationsConfig {
  sort: ChatwootConversationSort;
  status: ChatwootConversationStatus[] | null;
}

export interface ChatwootAppConfig {
  url: string;
  accountId: number;
  accountToken: string;
  inboxId: number;
  inboxIdentifier: string;
  locale: string;
  linkPreview?: 'OFF' | 'LG' | 'HG';
  templates?: Record<string, unknown>;
  commands?: ChatwootCommandsConfig;
  conversations?: ChatwootConversationsConfig;
}

export type WahaAppConfig = ChatwootAppConfig | Record<string, unknown>;

export interface WahaApp<TConfig = WahaAppConfig> {
  id: string;
  session: string;
  app: WahaAppType;
  enabled?: boolean;
  config: TConfig;
}

export interface ChatwootLocale {
  code?: string;
  locale?: string;
  name?: string;
  nativeName?: string;
  [key: string]: unknown;
}
