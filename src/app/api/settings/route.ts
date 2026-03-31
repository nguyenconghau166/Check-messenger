import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("app_settings")
    .select("setting_key, value_plain")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return settings as key-value pairs (don't expose encrypted values)
  const settings: Record<string, string> = {};
  for (const s of data || []) {
    settings[s.setting_key] = s.value_plain || "";
  }

  // Indicate which keys have encrypted values
  const { data: encrypted } = await supabase
    .from("app_settings")
    .select("setting_key")
    .eq("user_id", user.id)
    .not("value_encrypted", "is", null);

  for (const s of encrypted || []) {
    if (!settings[s.setting_key]) settings[s.setting_key] = "••••••••";
  }

  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { key, value, encrypted: isEncrypted } = body;

  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const upsertData: Record<string, unknown> = {
    user_id: user.id,
    setting_key: key,
    value_plain: isEncrypted ? null : value,
    value_encrypted: isEncrypted ? encrypt(value) : null,
  };

  const { error } = await supabase
    .from("app_settings")
    .upsert(upsertData, { onConflict: "user_id,setting_key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action: "settings.update",
    resource_type: "settings",
    detail: { key, encrypted: isEncrypted },
  });

  return NextResponse.json({ success: true });
}
