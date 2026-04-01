import type { ChannelAdapter, ChannelConversation, ChannelMessage } from "./types";

interface FacebookCredentials {
  page_id: string;
  page_access_token: string;
}

const GRAPH_API = "https://graph.facebook.com/v21.0";

function attachmentPlaceholder(att: Record<string, unknown>): string {
  const mimeType = (att.mime_type as string) || "";
  const name = (att.name as string) || "";
  if (mimeType.startsWith("image") || att.image_data) return "[Hình ảnh]";
  if (mimeType.startsWith("video") || att.video_data) return "[Video]";
  if (mimeType.startsWith("audio")) return "[Âm thanh]";
  if (name) return `[File: ${name}]`;
  return "[Đính kèm]";
}

export class FacebookAdapter implements ChannelAdapter {
  private creds: FacebookCredentials;

  constructor(credentials: FacebookCredentials) {
    this.creds = credentials;
  }

  async healthCheck(): Promise<boolean> {
    const res: Response = await fetch(
      `${GRAPH_API}/me?access_token=${this.creds.page_access_token}`
    );
    return res.ok;
  }

  async fetchRecentConversations(since?: Date): Promise<ChannelConversation[]> {
    const sinceTs = since ? Math.floor(since.getTime() / 1000) : 0;
    const conversations: ChannelConversation[] = [];

    let nextURL: string | null = `${GRAPH_API}/${this.creds.page_id}/conversations?fields=id,participants,updated_time&access_token=${this.creds.page_access_token}&limit=100`;

    while (nextURL) {
      const res: Response = await fetch(nextURL);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Facebook API error: ${err}`);
      }

      const data = await res.json();

      for (const conv of data.data || []) {
        const updatedTime = new Date(conv.updated_time);
        if (sinceTs && updatedTime.getTime() / 1000 < sinceTs) {
          nextURL = null;
          break;
        }

        const customer = conv.participants?.data?.find(
          (p: { id: string }) => p.id !== this.creds.page_id
        );

        const messages = await this.fetchConversationMessages(conv.id, sinceTs);

        conversations.push({
          external_conversation_id: conv.id,
          external_user_id: customer?.id || "",
          customer_name: customer?.name || "Unknown",
          messages,
          metadata: { updated_time: conv.updated_time },
        });
      }

      if (nextURL !== null) {
        nextURL = data.paging?.next || null;
      }
    }

    return conversations;
  }

  private async fetchConversationMessages(conversationId: string, sinceTs: number): Promise<ChannelMessage[]> {
    const messages: ChannelMessage[] = [];
    let nextURL: string | null = `${GRAPH_API}/${conversationId}/messages?fields=id,message,from,created_time,attachments,sticker&access_token=${this.creds.page_access_token}&limit=100`;

    while (nextURL) {
      const res: Response = await fetch(nextURL);
      if (!res.ok) break;

      const data = await res.json();

      for (const msg of data.data || []) {
        const createdTime = new Date(msg.created_time);
        if (sinceTs && createdTime.getTime() / 1000 < sinceTs) {
          return messages;
        }

        let content: string = msg.message || "";
        let contentType = "text";
        const attachmentsMeta: { type: string }[] = [];

        // Process attachments — store only lightweight metadata + placeholder in content
        if (msg.attachments?.data?.length) {
          const placeholders: string[] = [];
          for (const att of msg.attachments.data) {
            const placeholder = attachmentPlaceholder(att);
            placeholders.push(placeholder);
            attachmentsMeta.push({ type: att.mime_type || "file" });
          }
          const placeholderText = placeholders.join(" ");
          content = content ? `${content}\n${placeholderText}` : placeholderText;
          contentType = "file";
        }

        // Sticker
        if (msg.sticker) {
          content = content ? `${content}\n[Sticker]` : "[Sticker]";
          contentType = "sticker";
        }

        messages.push({
          external_message_id: msg.id,
          sender_type: msg.from?.id === this.creds.page_id ? "agent" : "customer",
          sender_name: msg.from?.name || "",
          sender_external_id: msg.from?.id || "",
          content,
          content_type: contentType,
          attachments: attachmentsMeta,
          sent_at: createdTime,
          raw_data: {},
        });
      }

      nextURL = data.paging?.next || null;
    }

    return messages;
  }
}
