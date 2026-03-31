import { createClient } from "@/lib/supabase/server";
import { runJob } from "@/lib/engine/analyzer";
import { NextResponse } from "next/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await runJob(id, user.id);

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "job.run",
      resource_type: "job",
      resource_id: id,
      detail: result,
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Job failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
