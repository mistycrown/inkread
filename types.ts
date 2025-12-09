
export interface IndexItem {
  id: string;             // UUID
  updated_at: number;     // Last modified timestamp
  created_at: number;
  is_deleted: boolean;    // Soft delete flag
  status: 'inbox' | 'archived';
  preview_text: string;   // Short preview for list
  tags: string[];
  source?: string;        // Source platform
  link?: string;          // External link
}

export interface IndexFile {
  last_sync_time: number;
  items: IndexItem[];
}

export interface AIStructuredData {
  title: string;
  summary: string;
  tags: string[];
  source?: string;      // extracted source platform (e.g. Bilibili, RedNote)
  link?: string;        // extracted primary URL
  embedding?: number[]; // Simplified for this demo
}

export interface ArticleDetail {
  id: string;
  created_at: number;
  updated_at: number;
  raw_info: string;       // Clipboard content
  user_note: string;      // User markdown notes
  ai_data?: AIStructuredData;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}

export interface AppSettings {
  webdav_url?: string;
  webdav_user?: string;
  webdav_password?: string;

  // Sync Settings
  sync_provider?: 'webdav' | 'supabase';
  supabase_url?: string;
  supabase_key?: string;

  // AI Settings
  openai_api_key?: string;
  openai_base_url?: string; // e.g. https://api.openai.com/v1
  openai_model?: string;    // e.g. gpt-4o, gpt-3.5-turbo

  // Prompt Templates
  prompt_templates: PromptTemplate[];
}

export enum SyncStatus {
  IDLE = 'IDLE',
  SYNCING = 'SYNCING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}