import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get counts in parallel
  const [channels, conversations, jobs, runs, costs, recentResults] = await Promise.all([
    supabase.from("channels").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("job_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("ai_usage_logs").select("cost_usd").eq("user_id", user.id),
    supabase
      .from("job_results")
      .select("*, conversation:conversations(customer_name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalCost = (costs.data || []).reduce((sum, r) => sum + Number(r.cost_usd), 0);

  // Calculate pass rate from recent results
  const results = recentResults.data || [];
  const passed = results.filter((r) => (r.detail as Record<string, unknown>)?.status === "pass").length;
  const passRate = results.length > 0 ? (passed / results.length) * 100 : 0;

  return NextResponse.json({
    total_channels: channels.count || 0,
    total_conversations: conversations.count || 0,
    total_jobs: jobs.count || 0,
    total_runs: runs.count || 0,
    total_cost: totalCost,
    pass_rate: Math.round(passRate),
    recent_results: results,
  });
}
