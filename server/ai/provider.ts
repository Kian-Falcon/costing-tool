export type AiProvider = "anthropic" | "openai";

export type AiCostingRequest = {
  provider: AiProvider;
  modelId: string;
  promptVersion: string;
  payload: unknown;
};

export async function requestAiCosting(_request: AiCostingRequest): Promise<never> {
  throw new Error("AI provider integration is intentionally server-only and not implemented in the scaffold.");
}
