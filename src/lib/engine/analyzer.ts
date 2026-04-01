import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { ClaudeProvider } from "@/lib/ai/claude";
import { GeminiProvider } from "@/lib/ai/gemini";
import { buildAnalysisPrompt, buildBatchAnalysisPrompt, formatTranscript } from "@/lib/ai/prompts";
import { calculateCostUSD, type AIProvider } from "@/lib/ai/provider";

interface SkipConditions {
  min_messages?: number;
  min_customer_messages?: number;
  exclude_keywords?: string[];
}

interface ConversationData {
  id: string;
  customer_name: string;
  messages: { sender_type: string; sender_name: string; content: string; sent_at: string }[];
}

function shouldSkip(conv: ConversationData, conditions: SkipConditions): string | null {
  const { messages } = conv;
  if (conditions.min_messages && messages.length < conditions.min_messages) {
    return `Ít hơn ${conditions.min_messages} tin nhắn (có ${messages.length})`;
  }
  if (conditions.min_customer_messages) {
    const customerMsgs = messages.filter((m) => m.sender_type === "customer").length;
    if (customerMsgs < conditions.min_customer_messages) {
      return `Khách chỉ gửi ${customerMsgs} tin nhắn (yêu cầu ${conditions.min_customer_messages})`;
    }
  }
  if (conditions.exclude_keywords && conditions.exclude_keywords.length > 0) {
    const allContent = messages.map((m) => m.content.toLowerCase()).join(" ");
    const uniqueWords = new Set(allContent.split(/\s+/));
    // Skip if the conversation ONLY contains excluded keywords (very short, trivial conversations)
    if (messages.length <= 2) {
      for (const kw of conditions.exclude_keywords) {
        if (kw && uniqueWords.has(kw.toLowerCase())) {
          return `Chứa từ khóa loại trừ: "${kw}"`;
        }
      }
    }
  }
  return null;
}

export async function runJob(jobId: string, userId: string, existingRunId?: string) {
  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (!job) throw new Error("Job not found");

  let runId = existingRunId;
  if (!runId) {
    const { data: run } = await supabase
      .from("job_runs")
      .insert({ job_id: jobId, user_id: userId, status: "running" })
      .select("id")
      .single();
    if (!run) throw new Error("Failed to create job run");
    runId = run.id;
  }

  try {
    const { data: keySetting } = await supabase
      .from("app_settings")
      .select("value_encrypted")
      .eq("user_id", userId)
      .eq("setting_key", `${job.ai_provider}_api_key`)
      .single();

    if (!keySetting?.value_encrypted) throw new Error("AI API key not configured");
    const apiKey = decrypt(keySetting.value_encrypted);

    let provider: AIProvider;
    if (job.ai_provider === "claude") {
      provider = new ClaudeProvider(apiKey);
    } else if (job.ai_provider === "gemini") {
      provider = new GeminiProvider(apiKey);
    } else {
      throw new Error(`Unknown AI provider: ${job.ai_provider}`);
    }

    // Get conversations
    const channelIds = job.input_channel_ids || [];
    let query = supabase
      .from("conversations")
      .select("id, customer_name, external_conversation_id")
      .eq("user_id", userId);

    if (channelIds.length > 0) query = query.in("channel_id", channelIds);
    if (job.last_run_at) query = query.gte("last_message_at", job.last_run_at);

    const { data: conversations } = await query.order("last_message_at", { ascending: false }).limit(100);

    // Load messages for all conversations and apply skip conditions
    const skipConditions: SkipConditions = job.skip_conditions || {};
    const batchSize = (job.rules_config as Record<string, number>)?.batch_size || 5;
    const eligible: ConversationData[] = [];
    let skippedCount = 0;

    for (const conv of conversations || []) {
      const { data: messages } = await supabase
        .from("messages")
        .select("sender_type, sender_name, content, sent_at")
        .eq("conversation_id", conv.id)
        .order("sent_at", { ascending: true });

      if (!messages || messages.length === 0) {
        skippedCount++;
        continue;
      }

      const convData: ConversationData = { id: conv.id, customer_name: conv.customer_name, messages };
      const skipReason = shouldSkip(convData, skipConditions);
      if (skipReason) {
        skippedCount++;
        continue;
      }

      eligible.push(convData);
    }

    let totalPassed = 0;
    let totalFailed = 0;
    let totalCost = 0;
    let analyzed = 0;
    const totalEligible = eligible.length;

    // Update initial progress
    await supabase
      .from("job_runs")
      .update({
        summary: { total: totalEligible, analyzed: 0, passed: 0, failed: 0, skipped: skippedCount, cost_usd: 0 },
      })
      .eq("id", runId);

    // Process in batches
    for (let i = 0; i < eligible.length; i += batchSize) {
      const batch = eligible.slice(i, i + batchSize);

      if (batch.length === 1 || batchSize === 1) {
        // Single mode
        const conv = batch[0];
        const transcript = formatTranscript(conv.messages);
        const prompt = buildAnalysisPrompt(transcript, job.rules_content || "Evaluate customer service quality");

        const { result, inputTokens, outputTokens } = await provider.analyze(prompt, job.rules_content || "", job.ai_model);
        result.conversation_id = conv.id;
        if (result.status === "pass") totalPassed++;
        else totalFailed++;

        await supabase.from("job_results").insert({
          job_run_id: runId,
          user_id: userId,
          conversation_id: conv.id,
          result_type: "qc_violation",
          severity: result.violations?.[0]?.severity || null,
          rule_name: result.violations?.[0]?.rule_name || null,
          evidence: result.violations?.[0]?.evidence || null,
          detail: { score: result.score, status: result.status, violations: result.violations, summary: result.summary },
          ai_raw_response: JSON.stringify(result),
          confidence: result.score / 100,
        });

        const cost = calculateCostUSD(job.ai_provider, job.ai_model, inputTokens, outputTokens);
        totalCost += cost;
        await supabase.from("ai_usage_logs").insert({
          user_id: userId, job_id: jobId, job_run_id: runId,
          provider: job.ai_provider, model: job.ai_model,
          input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: cost,
        });
        analyzed++;
      } else {
        // Batch mode
        const transcripts = batch.map((conv, idx) => ({
          index: idx + 1,
          customerName: conv.customer_name || "Unknown",
          transcript: formatTranscript(conv.messages),
        }));

        const prompt = buildBatchAnalysisPrompt(transcripts, job.rules_content || "Evaluate customer service quality");

        try {
          const { results, inputTokens, outputTokens } = await provider.analyzeBatch(prompt, job.ai_model, batch.length);

          const cost = calculateCostUSD(job.ai_provider, job.ai_model, inputTokens, outputTokens);
          totalCost += cost;
          await supabase.from("ai_usage_logs").insert({
            user_id: userId, job_id: jobId, job_run_id: runId,
            provider: job.ai_provider, model: job.ai_model,
            input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: cost,
          });

          // Map results back to conversations
          for (let j = 0; j < batch.length; j++) {
            const conv = batch[j];
            const result = results.find((r) => r.conversation_index === j + 1) || results[j];
            if (!result) continue;

            if (result.status === "pass") totalPassed++;
            else totalFailed++;

            await supabase.from("job_results").insert({
              job_run_id: runId,
              user_id: userId,
              conversation_id: conv.id,
              result_type: "qc_violation",
              severity: result.violations?.[0]?.severity || null,
              rule_name: result.violations?.[0]?.rule_name || null,
              evidence: result.violations?.[0]?.evidence || null,
              detail: { score: result.score, status: result.status, violations: result.violations, summary: result.summary },
              ai_raw_response: JSON.stringify(result),
              confidence: result.score / 100,
            });
            analyzed++;
          }
        } catch (batchErr) {
          // Fallback: if batch fails, process individually
          console.error("[analyzer] batch failed, falling back to individual:", batchErr);
          for (const conv of batch) {
            const transcript = formatTranscript(conv.messages);
            const singlePrompt = buildAnalysisPrompt(transcript, job.rules_content || "Evaluate customer service quality");

            try {
              const { result, inputTokens, outputTokens } = await provider.analyze(singlePrompt, job.rules_content || "", job.ai_model);
              result.conversation_id = conv.id;
              if (result.status === "pass") totalPassed++;
              else totalFailed++;

              await supabase.from("job_results").insert({
                job_run_id: runId, user_id: userId, conversation_id: conv.id,
                result_type: "qc_violation",
                severity: result.violations?.[0]?.severity || null,
                rule_name: result.violations?.[0]?.rule_name || null,
                evidence: result.violations?.[0]?.evidence || null,
                detail: { score: result.score, status: result.status, violations: result.violations, summary: result.summary },
                ai_raw_response: JSON.stringify(result),
                confidence: result.score / 100,
              });

              const cost = calculateCostUSD(job.ai_provider, job.ai_model, inputTokens, outputTokens);
              totalCost += cost;
              await supabase.from("ai_usage_logs").insert({
                user_id: userId, job_id: jobId, job_run_id: runId,
                provider: job.ai_provider, model: job.ai_model,
                input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: cost,
              });
              analyzed++;
            } catch (singleErr) {
              console.error(`[analyzer] single analysis failed for ${conv.id}:`, singleErr);
              analyzed++;
            }
          }
        }
      }

      // Update progress after each batch
      await supabase
        .from("job_runs")
        .update({
          summary: { total: totalEligible, analyzed, passed: totalPassed, failed: totalFailed, skipped: skippedCount, cost_usd: totalCost },
        })
        .eq("id", runId);
    }

    // Completed
    await supabase
      .from("job_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        summary: { total: totalEligible, analyzed, passed: totalPassed, failed: totalFailed, skipped: skippedCount, cost_usd: totalCost },
      })
      .eq("id", runId);

    await supabase
      .from("jobs")
      .update({ last_run_at: new Date().toISOString(), last_run_status: "success" })
      .eq("id", jobId);

    return { runId, total: totalEligible, passed: totalPassed, failed: totalFailed, skipped: skippedCount };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("job_runs")
      .update({ status: "error", finished_at: new Date().toISOString(), error_message: errorMsg })
      .eq("id", runId);
    await supabase
      .from("jobs")
      .update({ last_run_status: "error" })
      .eq("id", jobId);
    throw err;
  }
}
