import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      name: body.name,
      description: body.description || null,
      job_type: body.job_type || "qc_analysis",
      input_channel_ids: body.input_channel_ids || [],
      rules_content: body.rules_content || null,
      rules_config: body.rules_config || {},
      ai_provider: body.ai_provider || "claude",
      ai_model: body.ai_model || "claude-haiku-4-5-20251001",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action: "job.create",
    resource_type: "job",
    resource_id: data.id,
    detail: { name: body.name },
  });

  return NextResponse.json(data, { status: 201 });
}
