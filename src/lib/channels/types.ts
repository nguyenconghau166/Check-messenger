export interface ChannelMessage {
  external_message_id: string;
  sender_type: "customer" | "agent" | "system";
  sender_name: string;
  sender_external_id: string;
  content: string;
  content_type: string;
  attachments: unknown[];
  sent_at: Date;
  raw_data: Record<string, unknown>;
}

export interface ChannelConversation {
  external_conversation_id: string;
  external_user_id: string;
  customer_name: string;
  messages: ChannelMessage[];
  metadata: Record<string, unknown>;
}

export interface ChannelAdapter {
  fetchRecentConversations(since?: Date): Promise<ChannelConversation[]>;
  healthCheck(): Promise<boolean>;
}
