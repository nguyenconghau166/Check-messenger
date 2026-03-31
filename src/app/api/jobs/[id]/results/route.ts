import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("run_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  // Get run IDs for this job
  let query = supabase
    .from("job_results")
    .select("*, conversation:conversations(customer_name, external_conversation_id)", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (runId) {
    query = query.eq("job_run_id", runId);
  } else {
    // Get all results for runs of this job
    const { data: runs } = await supabase
      .from("job_runs")
      .select("id")
      .eq("job_id", id);
    const runIds = (runs || []).map((r) => r.id);
    if (runIds.length === 0) return NextResponse.json({ data: [], total: 0, page, limit });
    query = query.in("job_run_id", runIds);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, limit });
}
