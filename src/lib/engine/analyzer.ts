import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { ClaudeProvider } from "@/lib/ai/claude";
import { GeminiProvider } from "@/lib/ai/gemini";
import { buildAnalysisPrompt, formatTranscript } from "@/lib/ai/prompts";
import { calculateCostUSD, type AIProvider } from "@/lib/ai/provider";

export async function runJob(jobId: string, userId: string) {
  const supabase = createAdminClient();

  // Get job
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (!job) throw new Error("Job not found");

  // Create job run
  const { data: run } = await supabase
    .from("job_runs")
    .insert({ job_id: jobId, user_id: userId, status: "running" })
    .select("id")
    .single();

  if (!run) throw new Error("Failed to create job run");

  try {
    // Get AI API key from settings
    const { data: keySetting } = await supabase
      .from("app_settings")
      .select("value_encrypted")
      .eq("user_id", userId)
      .eq("setting_key", `${job.ai_provider}_api_key`)
      .single();

    if (!keySetting?.value_encrypted) throw new Error("AI API key not configured");
    const apiKey = decrypt(keySetting.value_encrypted);

    // Create AI provider
    let provider: AIProvider;
    if (job.ai_provider === "claude") {
      provider = new ClaudeProvider(apiKey);
    } else if (job.ai_provider === "gemini") {
      provider = new GeminiProvider(apiKey);
    } else {
      throw new Error(`Unknown AI provider: ${job.ai_provider}`);
    }

    // Get conversations to analyze
    const channelIds = job.input_channel_ids || [];
    let query = supabase
      .from("conversations")
      .select("id, customer_name, external_conversation_id")
      .eq("user_id", userId);

    if (channelIds.length > 0) {
      query = query.in("channel_id", channelIds);
    }

    // Only analyze conversations since last run
    if (job.last_run_at) {
      query = query.gte("last_message_at", job.last_run_at);
    }

    const { data: conversations } = await query.order("last_message_at", { ascending: false }).limit(100);

    let totalPassed = 0;
    let totalFailed = 0;
    let totalCost = 0;

    for (const conv of conversations || []) {
      // Get messages
      const { data: messages } = await supabase
        .from("messages")
        .select("sender_type, sender_name, content, sent_at")
        .eq("conversation_id", conv.id)
        .order("sent_at", { ascending: true });

      if (!messages || messages.length === 0) continue;

      const transcript = formatTranscript(messages);
      const prompt = buildAnalysisPrompt(transcript, job.rules_content || "Đánh giá chất lượng CSKH tổng thể");

      const { result, inputTokens, outputTokens } = await provider.analyze(
        prompt,
        job.rules_content || "",
        job.ai_model
      );

      result.conversation_id = conv.id;
      if (result.status === "pass") totalPassed++;
      else totalFailed++;

      // Save result
      await supabase.from("job_results").insert({
        job_run_id: run.id,
        user_id: userId,
        conversation_id: conv.id,
        result_type: "qc_violation",
        severity: result.violations?.[0]?.severity || null,
        rule_name: result.violations?.[0]?.rule_name || null,
        evidence: result.violations?.[0]?.evidence || null,
        detail: {
          score: result.score,
          status: result.status,
          violations: result.violations,
          summary: result.summary,
        },
        ai_raw_response: JSON.stringify(result),
        confidence: result.score / 100,
      });

      // Log AI usage
      const cost = calculateCostUSD(job.ai_provider, job.ai_model, inputTokens, outputTokens);
      totalCost += cost;

      await supabase.from("ai_usage_logs").insert({
        user_id: userId,
        job_id: jobId,
        job_run_id: run.id,
        provider: job.ai_provider,
        model: job.ai_model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: cost,
      });
    }

    // Update job run
    await supabase
      .from("job_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        summary: {
          total: (conversations || []).length,
          passed: totalPassed,
          failed: totalFailed,
          cost_usd: totalCost,
        },
      })
      .eq("id", run.id);

    // Update job
    await supabase
      .from("jobs")
      .update({ last_run_at: new Date().toISOString(), last_run_status: "success" })
      .eq("id", jobId);

    return { runId: run.id, total: (conversations || []).length, passed: totalPassed, failed: totalFailed };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("job_runs")
      .update({ status: "error", finished_at: new Date().toISOString(), error_message: errorMsg })
      .eq("id", run.id);

    await supabase
      .from("jobs")
      .update({ last_run_status: "error" })
      .eq("id", jobId);

    throw err;
  }
}
