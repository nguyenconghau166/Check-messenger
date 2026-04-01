import type { ChannelAdapter, ChannelConversation, ChannelMessage } from "./types";

interface ZaloCredentials {
  oa_id: string;
  access_token: string;
  refresh_token: string;
  app_id: string;
  app_secret: string;
}

const ZALO_API = "https://openapi.zalo.me/v3.0";

function zaloAttachmentPlaceholder(msgType: string): string {
  switch (msgType) {
    case "image": return "[Hình ảnh]";
    case "gif": return "[GIF]";
    case "video": return "[Video]";
    case "audio": return "[Âm thanh]";
    case "file": return "[File]";
    case "sticker": return "[Sticker]";
    case "location": return "[Vị trí]";
    case "link": return "[Liên kết]";
    default: return "[Đính kèm]";
  }
}

export class ZaloAdapter implements ChannelAdapter {
  private creds: ZaloCredentials;

  constructor(credentials: ZaloCredentials) {
    this.creds = credentials;
  }

  async healthCheck(): Promise<boolean> {
    const res = await fetch(`${ZALO_API}/oa/getoa`, {
      headers: { access_token: this.creds.access_token },
    });
    return res.ok;
  }

  async fetchRecentConversations(since?: Date): Promise<ChannelConversation[]> {
    const conversations: ChannelConversation[] = [];

    const listRes = await fetch(
      `${ZALO_API}/oa/conversation/list?offset=0&count=50`,
      { headers: { access_token: this.creds.access_token } }
    );

    if (!listRes.ok) throw new Error(`Zalo API error: ${await listRes.text()}`);
    const listData = await listRes.json();

    for (const conv of listData.data || []) {
      if (since && new Date(conv.updated_at * 1000) < since) continue;

      const msgRes = await fetch(
        `${ZALO_API}/oa/conversation/detail?user_id=${conv.user_id}&offset=0&count=50`,
        { headers: { access_token: this.creds.access_token } }
      );

      const msgData = await msgRes.json();
      const messages: ChannelMessage[] = (msgData.data || []).map(
        (msg: { msg_id: string; type: string; from_id: string; from_display_name?: string; message?: string; created_time: number; attachments?: unknown[] }) => {
          let content = msg.message || "";
          let contentType = "text";
          const attachmentsMeta: { type: string }[] = [];

          // For non-text messages, add placeholder instead of storing attachment data
          if (msg.type !== "text") {
            const placeholder = zaloAttachmentPlaceholder(msg.type);
            content = content ? `${content}\n${placeholder}` : placeholder;
            contentType = "file";
            attachmentsMeta.push({ type: msg.type });
          }

          return {
            external_message_id: msg.msg_id,
            sender_type: msg.from_id === this.creds.oa_id ? "agent" as const : "customer" as const,
            sender_name: msg.from_display_name || "",
            sender_external_id: msg.from_id || "",
            content,
            content_type: contentType,
            attachments: attachmentsMeta,
            sent_at: new Date(msg.created_time),
            raw_data: {},
          };
        }
      );

      conversations.push({
        external_conversation_id: conv.user_id,
        external_user_id: conv.user_id,
        customer_name: conv.display_name || "Unknown",
        messages,
        metadata: {},
      });
    }

    return conversations;
  }

  async refreshAccessToken(): Promise<{ access_token: string; refresh_token: string }> {
    const res = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", secret_key: this.creds.app_secret },
      body: new URLSearchParams({
        refresh_token: this.creds.refresh_token,
        app_id: this.creds.app_id,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(`Zalo token refresh error: ${data.error_description}`);
    return { access_token: data.access_token, refresh_token: data.refresh_token };
  }
}
