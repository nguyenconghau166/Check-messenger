import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runJob } from "@/lib/engine/analyzer";
import { NextResponse } from "next/server";
import { after } from "next/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify job exists
  const admin = createAdminClient();
  const { data: job } = await admin
    .from("jobs")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Create job_run immediately with status "running"
  const { data: run } = await admin
    .from("job_runs")
    .insert({ job_id: id, user_id: user.id, status: "running" })
    .select("id")
    .single();

  if (!run) return NextResponse.json({ error: "Failed to create job run" }, { status: 500 });

  // Update job to show it's running
  await admin
    .from("jobs")
    .update({ last_run_status: "running" })
    .eq("id", id);

  // Run the job in the background after the response is sent
  const userId = user.id;
  after(async () => {
    try {
      await runJob(id, userId, run.id);

      await admin.from("activity_logs").insert({
        user_id: userId,
        action: "job.run",
        resource_type: "job",
        resource_id: id,
        detail: { status: "success", run_id: run.id },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[job] run ${run.id} failed:`, errorMsg);
    }
  });

  // Return immediately with the run ID
  return NextResponse.json({ run_id: run.id, status: "running" });
}
