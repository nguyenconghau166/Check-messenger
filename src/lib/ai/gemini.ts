import { GoogleGenAI } from "@google/genai";
import type { AIProvider, AnalysisResult } from "./provider";

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async analyze(
    prompt: string,
    _rules: string,
    model: string
  ): Promise<{ result: AnalysisResult; inputTokens: number; outputTokens: number }> {
    const response = await this.client.models.generateContent({
      model,
      contents: prompt,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    const result: AnalysisResult = jsonMatch
      ? JSON.parse(jsonMatch[1] || jsonMatch[0])
      : { score: 0, status: "fail", violations: [], summary: text };

    const inputTokens = response.usageMetadata?.promptTokenCount || 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

    return { result, inputTokens, outputTokens };
  }
}
