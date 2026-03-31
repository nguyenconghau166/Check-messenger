import { createClient } from "@/lib/supabase/server";
import { syncChannel } from "@/lib/engine/sync";
import { NextResponse } from "next/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await syncChannel(id, user.id);

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "channel.sync",
      resource_type: "channel",
      resource_id: id,
      detail: result,
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";

    // Update channel with error
    await supabase
      .from("channels")
      .update({ last_sync_status: "error", last_sync_error: msg })
      .eq("id", id);

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
