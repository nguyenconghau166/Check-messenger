export interface AnalysisResult {
  conversation_id: string;
  score: number;
  status: "pass" | "fail";
  violations: {
    rule_name: string;
    severity: string;
    evidence: string;
    detail: string;
  }[];
  summary: string;
}

export interface BatchAnalysisResult {
  conversation_index: number;
  score: number;
  status: "pass" | "fail";
  violations: {
    rule_name: string;
    severity: string;
    evidence: string;
    detail: string;
  }[];
  summary: string;
}

export interface AIProvider {
  analyze(
    transcript: string,
    rules: string,
    model: string
  ): Promise<{ result: AnalysisResult; inputTokens: number; outputTokens: number }>;

  analyzeBatch(
    prompt: string,
    model: string,
    expectedCount: number
  ): Promise<{ results: BatchAnalysisResult[]; inputTokens: number; outputTokens: number }>;
}

export function calculateCostUSD(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
    "claude-sonnet-4-5-20250514": { input: 3.0, output: 15.0 },
    "claude-opus-4-0-20250514": { input: 15.0, output: 75.0 },
    "gemini-2.0-flash": { input: 0.1, output: 0.4 },
    "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  };
  const p = pricing[model] || { input: 1.0, output: 5.0 };
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}
