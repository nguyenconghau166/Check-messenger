import { createClient } from "@/lib/supabase/server";
import { syncChannel } from "@/lib/engine/sync";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse optional sync options from query params
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode"); // "full" = sync all history
  const sinceParam = searchParams.get("since"); // "YYYY-MM-DD" = sync from specific date

  let sinceOverride: Date | undefined;
  if (mode === "full") {
    sinceOverride = new Date(0); // epoch = all history
  } else if (sinceParam) {
    sinceOverride = new Date(sinceParam);
    if (isNaN(sinceOverride.getTime())) {
      return NextResponse.json({ error: "Invalid since date format. Use YYYY-MM-DD." }, { status: 400 });
    }
  }

  try {
    const result = await syncChannel(id, user.id, { sinceOverride });

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
