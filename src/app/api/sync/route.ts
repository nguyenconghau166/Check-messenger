import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getConversations, getMessages } from "@/lib/facebook";
import type { FBConversation, FBMessage } from "@/lib/types";

export const maxDuration = 300; // 5 minutes for Vercel Pro

export async function POST(request: NextRequest) {
  const { pageId } = await request.json();

  if (!pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }

  // Get page from database
  const { data: page } = await supabaseAdmin
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .single();

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Create sync log
  const { data: syncLog } = await supabaseAdmin
    .from("sync_logs")
    .insert({
      page_id: page.id,
      sync_type: "full",
      status: "running",
    })
    .select("id")
    .single();

  let totalConversations = 0;
  let totalMessages = 0;

  try {
    // Fetch all conversations with pagination
    let after: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const convResponse = await getConversations(
        page.facebook_page_id,
        page.access_token,
        after
      );

      for (const conv of convResponse.data) {
        totalConversations++;

        // Extract participant (non-page)
        const participant = conv.participants?.data?.find(
          (p: { id: string }) => p.id !== page.facebook_page_id
        );

        // Upsert conversation
        const { data: dbConv } = await supabaseAdmin
          .from("conversations")
          .upsert(
            {
              facebook_conversation_id: conv.id,
              page_id: page.id,
              participant_name: participant?.name || null,
              participant_facebook_id: participant?.id || null,
              snippet: conv.snippet || null,
              last_message_at: conv.updated_time,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "facebook_conversation_id" }
          )
          .select("id")
          .single();

        if (!dbConv) continue;

        // Fetch all messages for this conversation
        let msgAfter: string | undefined;
        let msgHasMore = true;
        let convMessageCount = 0;

        while (msgHasMore) {
          const msgResponse = await getMessages(
            conv.id,
            page.access_token,
            msgAfter
          );

          for (const msg of msgResponse.data) {
            totalMessages++;
            convMessageCount++;

            await supabaseAdmin.from("messages").upsert(
              {
                facebook_message_id: msg.id,
                conversation_id: dbConv.id,
                sender_id: msg.from?.id || null,
                sender_name: msg.from?.name || null,
                is_page_reply: msg.from?.id === page.facebook_page_id,
                message_text: msg.message || null,
                attachments: msg.attachments || null,
                facebook_created_at: msg.created_time,
              },
              { onConflict: "facebook_message_id" }
            );
          }

          msgAfter = msgResponse.paging?.cursors?.after;
          msgHasMore = !!msgAfter && msgResponse.data.length > 0;

          // Small delay to respect rate limits
          if (msgHasMore) await delay(200);
        }

        // Update conversation message count
        await supabaseAdmin
          .from("conversations")
          .update({ message_count: convMessageCount })
          .eq("id", dbConv.id);
      }

      after = convResponse.paging?.cursors?.after;
      hasMore = !!after && convResponse.data.length > 0;

      if (hasMore) await delay(200);
    }

    // Update page last_synced_at
    await supabaseAdmin
      .from("pages")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", page.id);

    // Update sync log
    await supabaseAdmin
      .from("sync_logs")
      .update({
        status: "completed",
        conversations_synced: totalConversations,
        messages_synced: totalMessages,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLog!.id);

    return NextResponse.json({
      status: "completed",
      conversations_synced: totalConversations,
      messages_synced: totalMessages,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Sync error:", err);

    if (syncLog) {
      await supabaseAdmin
        .from("sync_logs")
        .update({
          status: "failed",
          error_message: errorMessage,
          conversations_synced: totalConversations,
          messages_synced: totalMessages,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLog.id);
    }

    return NextResponse.json(
      { error: errorMessage, conversations_synced: totalConversations, messages_synced: totalMessages },
      { status: 500 }
    );
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
