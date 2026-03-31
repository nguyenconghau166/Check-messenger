import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { FacebookAdapter } from "@/lib/channels/facebook";
import { ZaloAdapter } from "@/lib/channels/zalo";
import type { ChannelAdapter } from "@/lib/channels/types";

export async function syncChannel(channelId: string, userId: string) {
  const supabase = createAdminClient();

  // Get channel
  const { data: channel, error } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .eq("user_id", userId)
    .single();

  if (error || !channel) throw new Error("Channel not found");

  // Decrypt credentials
  const creds = JSON.parse(decrypt(channel.credentials_encrypted));

  // Create adapter
  let adapter: ChannelAdapter;
  if (channel.channel_type === "facebook") {
    adapter = new FacebookAdapter(creds);
  } else if (channel.channel_type === "zalo_oa") {
    adapter = new ZaloAdapter(creds);
  } else {
    throw new Error(`Unknown channel type: ${channel.channel_type}`);
  }

  // Fetch conversations since last sync
  const since = channel.last_sync_at ? new Date(channel.last_sync_at) : undefined;
  const conversations = await adapter.fetchRecentConversations(since);

  let totalMessages = 0;

  for (const conv of conversations) {
    // Upsert conversation
    const { data: dbConv } = await supabase
      .from("conversations")
      .upsert(
        {
          user_id: userId,
          channel_id: channelId,
          external_conversation_id: conv.external_conversation_id,
          external_user_id: conv.external_user_id,
          customer_name: conv.customer_name,
          last_message_at: conv.messages.length > 0
            ? conv.messages[conv.messages.length - 1].sent_at.toISOString()
            : null,
          message_count: conv.messages.length,
          metadata: conv.metadata,
        },
        { onConflict: "user_id,channel_id,external_conversation_id" }
      )
      .select("id")
      .single();

    if (!dbConv) continue;

    // Upsert messages
    for (const msg of conv.messages) {
      await supabase.from("messages").upsert(
        {
          user_id: userId,
          conversation_id: dbConv.id,
          external_message_id: msg.external_message_id,
          sender_type: msg.sender_type,
          sender_name: msg.sender_name,
          sender_external_id: msg.sender_external_id,
          content: msg.content,
          content_type: msg.content_type,
          attachments: msg.attachments,
          sent_at: msg.sent_at.toISOString(),
          raw_data: msg.raw_data,
        },
        { onConflict: "user_id,conversation_id,external_message_id" }
      );
      totalMessages++;
    }
  }

  // Update channel sync status
  await supabase
    .from("channels")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: "success",
      last_sync_error: null,
    })
    .eq("id", channelId);

  return { conversations: conversations.length, messages: totalMessages };
}
