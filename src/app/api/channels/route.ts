import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Strip encrypted credentials from response
  const safe = (data || []).map(({ credentials_encrypted: _, ...rest }) => rest);
  return NextResponse.json(safe);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, channel_type, credentials } = body;

  if (!name || !channel_type || !credentials) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const credentials_encrypted = encrypt(JSON.stringify(credentials));
  const external_id = credentials.page_id || credentials.oa_id || "";

  const { data, error } = await supabase
    .from("channels")
    .insert({
      user_id: user.id,
      name,
      channel_type,
      external_id,
      credentials_encrypted,
    })
    .select("id, name, channel_type, external_id, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log activity
  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action: "channel.create",
    resource_type: "channel",
    resource_id: data.id,
    detail: { name, channel_type },
  });

  return NextResponse.json(data, { status: 201 });
}
