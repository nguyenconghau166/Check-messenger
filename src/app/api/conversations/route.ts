import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channel_id");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("conversations")
    .select("*, channel:channels(name, channel_type)", { count: "exact" })
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (channelId) query = query.eq("channel_id", channelId);
  if (search) query = query.ilike("customer_name", `%${search}%`);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch last message content for each conversation
  const conversationsWithLastMsg = await Promise.all(
    (data || []).map(async (conv) => {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, sender_type, sender_name")
        .eq("conversation_id", conv.id)
        .order("sent_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...conv,
        last_message_content: lastMsg?.content || null,
        last_message_sender_type: lastMsg?.sender_type || null,
        last_message_sender_name: lastMsg?.sender_name || null,
      };
    })
  );

  return NextResponse.json({ data: conversationsWithLastMsg, total: count, page, limit });
}
