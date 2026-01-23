
export enum UrgencyTier {
  TIER1 = 'TIER 1 (CRITICAL)',
  TIER2 = 'TIER 2 (IMPORTANT)',
  TIER3 = 'TIER 3 (INFO)',
}

export type EventCategory = 'Academic' | 'Work' | 'Organization' | 'Personal' | 'Other';

export interface LifeEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  source: 'gmail' | 'outlook' | 'classroom' | 'manual' | 'ocr_schedule' | 'ocr_task';
  category: EventCategory;
  subject?: string;
  room?: string;
  completed?: boolean;
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'annual' | 'none';
}

export interface SentryLog {
  id: string;
  timestamp: string;
  tier: UrgencyTier;
  action: string;
  reason: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
  timestamp: string;
}

export enum AppMode {
  DASHBOARD = 'dashboard',
  SENTRY = 'sentry',
  COMPANION = 'companion',
  CALENDAR = 'calendar',
  SETTINGS = 'settings',
  GUIDE = 'guide'
}

export type AIProvider = 'google' | 'openai' | 'azure' | 'openrouter';

export interface RoutineItem {
  subject: string;
  category: EventCategory;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  time: string;
  room?: string;
}

export type Theme = 'dark' | 'light' | 'system';

export interface EmailAccount {
  id: string;
  email: string;
  appPassword: string;
  server: string;
}

export interface AIKeys {
  provider: AIProvider;
  google?: string;
  googleModel?: string; // e.g. gemini-2.0-flash
  openai?: string;
  openaiModel?: string; // e.g. gpt-4o
  openrouter?: string;
  openrouterModel?: string; // e.g. google/gemini-2.0-flash-001
  azure?: string;
  azureEndpoint?: string;
  azureDeployment?: string; // User needs to specify their deployment name
  customPersona?: string; // User-defined system prompt/personality
  classroomRefreshToken?: string; // OAuth2 Refresh Token for Google Classroom (Pro feature)
  googleClientId?: string; // For generating tokens locally
  googleClientSecret?: string; // For exchanging tokens locally (Personal Desktop App use only)
}

export interface AzureOCRConfig {
  endpoint: string;
  key: string;
  enabled: boolean;
}
