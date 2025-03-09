export interface Label {
  id: string;
  name: string;
  color: string;
  gmailLabelId?: string;  // Store Gmail's label ID for syncing
}

export interface Email {
  id: string;
  threadId: string;  // Add this for tracking email threads
  from: string;
  to: string[];
  subject: string;
  body: string;
  html?: string;
  timestamp: Date;
  read: boolean;
  category?: EmailCategory;
  importance: EmailImportance;
  aiSummary?: string;
  suggestedAction?: EmailAction;
  suggestedResponse?: string;
  handled: boolean;
  labels: Label[];  // Add labels array to Email interface
}

export enum EmailCategory {
  URGENT = 'URGENT',
  IMPORTANT = 'IMPORTANT',
  FOLLOW_UP = 'FOLLOW_UP',
  NEWSLETTER = 'NEWSLETTER',
  PROMOTIONAL = 'PROMOTIONAL',
  SPAM = 'SPAM',
  OTHER = 'OTHER'
}

export enum EmailImportance {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum EmailAction {
  REPLY = 'REPLY',
  FORWARD = 'FORWARD',
  ARCHIVE = 'ARCHIVE',
  DELETE = 'DELETE',
  FLAG = 'FLAG',
  NONE = 'NONE',
  MARK_IMPORTANT = 'MARK_IMPORTANT'
}

export interface EmailAccount {
  id: string;
  email: string;
  provider: EmailProvider;
  accessToken: string;
  refreshToken?: string;
  connected: boolean;
}

export enum EmailProvider {
  GMAIL = 'GMAIL',
  OUTLOOK = 'OUTLOOK',
  IMAP = 'IMAP'
}

export interface AIResponse {
  summary: string;
  suggestedAction: EmailAction;
  suggestedResponse?: string;
  category: EmailCategory;
  importance: EmailImportance;
  confidence: number;
  suggestedLabel: Label | null;  // New field for AI's label suggestion
}

export interface AutomationRule {
  id: string;
  label: Label;
  action: EmailAction;
  enabled: boolean;
  template?: string;
} 