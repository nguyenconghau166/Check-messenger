// Database types matching Supabase schema

export interface Page {
  id: string; // UUID
  facebook_page_id: string;
  page_name: string | null;
  access_token: string;
  token_expires_at: string | null;
  last_synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Conversation {
  id: string; // UUID
  facebook_conversation_id: string;
  page_id: string; // UUID FK -> pages.id
  participant_name: string | null;
  participant_facebook_id: string | null;
  snippet: string | null;
  message_count: number | null;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Message {
  id: string; // UUID
  facebook_message_id: string;
  conversation_id: string; // UUID FK -> conversations.id
  sender_name: string | null;
  sender_id: string | null;
  is_page_reply: boolean | null;
  message_text: string | null;
  attachments: Record<string, unknown> | null;
  facebook_created_at: string;
  created_at: string | null;
}

export interface SyncLog {
  id: string; // UUID
  page_id: string | null;
  sync_type: string;
  status: string;
  conversations_synced: number | null;
  messages_synced: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

// Facebook Graph API response types

export interface FBPageAccount {
  id: string;
  name: string;
  access_token: string;
  category: string;
}

export interface FBConversation {
  id: string;
  snippet: string;
  updated_time: string;
  participants?: {
    data: Array<{ id: string; name: string }>;
  };
}

export interface FBMessage {
  id: string;
  message?: string;
  from: { id: string; name: string };
  created_time: string;
  attachments?: {
    data: Array<{
      mime_type?: string;
      name?: string;
      size?: number;
      image_data?: { url: string; width: number; height: number };
      file_url?: string;
    }>;
  };
}

export interface FBPagingResponse<T> {
  data: T[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}
