import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AnalysisResult, BatchAnalysisResult } from "./provider";

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyze(
    prompt: string,
    _rules: string,
    model: string
  ): Promise<{ result: AnalysisResult; inputTokens: number; outputTokens: number }> {
    const response = await this.client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");

    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    const result: AnalysisResult = jsonMatch
      ? JSON.parse(jsonMatch[1] || jsonMatch[0])
      : { score: 0, status: "fail", violations: [], summary: text };

    return {
      result,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  async analyzeBatch(
    prompt: string,
    model: string,
    _expectedCount: number
  ): Promise<{ results: BatchAnalysisResult[]; inputTokens: number; outputTokens: number }> {
    const response = await this.client.messages.create({
      model,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");

    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\[[\s\S]*\]/);
    const results: BatchAnalysisResult[] = jsonMatch
      ? JSON.parse(jsonMatch[1] || jsonMatch[0])
      : [];

    return {
      results,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
