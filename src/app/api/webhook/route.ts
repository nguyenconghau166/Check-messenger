import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: Facebook webhook verification
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = (process.env.FACEBOOK_VERIFY_TOKEN || "").trim();

  console.log("Webhook verify:", { mode, token, verifyToken: verifyToken ? "set" : "missing", match: token === verifyToken });

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// POST: Receive real-time message events from Facebook
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.object !== "page") {
    return new Response("Not a page event", { status: 404 });
  }

  // Process each entry
  for (const entry of body.entry || []) {
    const pageId = entry.id;

    // Look up the page in our database
    const { data: page } = await supabaseAdmin
      .from("pages")
      .select("id, facebook_page_id, access_token")
      .eq("facebook_page_id", pageId)
      .single();

    if (!page) continue;

    for (const event of entry.messaging || []) {
      const senderId = event.sender?.id;
      const recipientId = event.recipient?.id;
      const messageData = event.message;

      if (!messageData?.mid) continue;

      const isPageReply = senderId === pageId;
      const participantFbId = isPageReply ? recipientId : senderId;

      // Find or create conversation by participant
      let { data: conversation } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("page_id", page.id)
        .eq("participant_facebook_id", participantFbId)
        .single();

      if (!conversation) {
        const { data: newConv } = await supabaseAdmin
          .from("conversations")
          .insert({
            facebook_conversation_id: `webhook_${pageId}_${participantFbId}`,
            page_id: page.id,
            participant_facebook_id: participantFbId,
            snippet: messageData.text || "",
            last_message_at: new Date(event.timestamp).toISOString(),
          })
          .select("id")
          .single();
        conversation = newConv;
      }

      if (!conversation) continue;

      // Upsert message
      await supabaseAdmin.from("messages").upsert(
        {
          facebook_message_id: messageData.mid,
          conversation_id: conversation.id,
          sender_id: senderId,
          sender_name: isPageReply ? "Page" : null,
          is_page_reply: isPageReply,
          message_text: messageData.text || null,
          attachments: messageData.attachments || null,
          facebook_created_at: new Date(event.timestamp).toISOString(),
        },
        { onConflict: "facebook_message_id" }
      );

      // Update conversation snippet
      await supabaseAdmin
        .from("conversations")
        .update({
          snippet: messageData.text || conversation.id,
          last_message_at: new Date(event.timestamp).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation.id);
    }
  }

  // Always return 200 quickly
  return NextResponse.json({ status: "ok" });
}
