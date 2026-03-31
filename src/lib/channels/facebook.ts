import type { ChannelAdapter, ChannelConversation, ChannelMessage } from "./types";

interface FacebookCredentials {
  page_id: string;
  page_access_token: string;
}

const GRAPH_API = "https://graph.facebook.com/v21.0";

export class FacebookAdapter implements ChannelAdapter {
  private creds: FacebookCredentials;

  constructor(credentials: FacebookCredentials) {
    this.creds = credentials;
  }

  async healthCheck(): Promise<boolean> {
    const res = await fetch(
      `${GRAPH_API}/me?access_token=${this.creds.page_access_token}`
    );
    return res.ok;
  }

  async fetchRecentConversations(since?: Date): Promise<ChannelConversation[]> {
    const sinceTs = since ? Math.floor(since.getTime() / 1000) : 0;
    const url = `${GRAPH_API}/${this.creds.page_id}/conversations?fields=id,participants,updated_time,messages{message,from,created_time,attachments}&access_token=${this.creds.page_access_token}&limit=50`;

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Facebook API error: ${err}`);
    }

    const data = await res.json();
    const conversations: ChannelConversation[] = [];

    for (const conv of data.data || []) {
      const updatedTime = new Date(conv.updated_time);
      if (sinceTs && updatedTime.getTime() / 1000 < sinceTs) continue;

      const customer = conv.participants?.data?.find(
        (p: { id: string }) => p.id !== this.creds.page_id
      );

      const messages: ChannelMessage[] = (conv.messages?.data || []).map(
        (msg: { id: string; from: { id: string; name: string }; message?: string; created_time: string; attachments?: { data: unknown[] } }) => ({
          external_message_id: msg.id,
          sender_type: msg.from?.id === this.creds.page_id ? "agent" : "customer",
          sender_name: msg.from?.name || "",
          sender_external_id: msg.from?.id || "",
          content: msg.message || "",
          content_type: msg.attachments?.data?.length ? "file" : "text",
          attachments: msg.attachments?.data || [],
          sent_at: new Date(msg.created_time),
          raw_data: msg,
        })
      );

      conversations.push({
        external_conversation_id: conv.id,
        external_user_id: customer?.id || "",
        customer_name: customer?.name || "Unknown",
        messages,
        metadata: { updated_time: conv.updated_time },
      });
    }

    return conversations;
  }
}
