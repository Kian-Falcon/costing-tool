import { type Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { env } from "./env";
import { prisma } from "./prisma";

export type AiProvider = "anthropic" | "openai";

export type AiCallInput = {
  provider: AiProvider;
  prompt: string;
  promptVersion: string;
  modelId?: string;
};

export type AiImageInput = {
  base64: string;
  mimeType?: string;
};

export type AiVisionCallInput = AiCallInput & {
  images: AiImageInput[];
};

export type AiCallResult = {
  provider: AiProvider;
  modelId: string;
  text: string;
  requestId?: string;
};

export async function callAiText(input: AiCallInput): Promise<AiCallResult> {
  const modelId = input.modelId ?? defaultModel(input.provider);
  const requestHash = hash(`${input.provider}:${modelId}:${input.promptVersion}:${input.prompt}`);
  return callAiWithCache({
    ...input,
    modelId,
    requestHash,
    promptRecord: { text: input.prompt },
    execute: () => (input.provider === "openai" ? callOpenAi(modelId, input.prompt) : callAnthropic(modelId, input.prompt))
  });
}

export async function callAiVision(input: AiVisionCallInput): Promise<AiCallResult> {
  const modelId = input.modelId ?? defaultModel(input.provider);
  const imageHash = input.images.map((image) => hash(`${image.mimeType ?? "image/jpeg"}:${image.base64}`)).join(":");
  const requestHash = hash(`${input.provider}:${modelId}:${input.promptVersion}:${input.prompt}:${imageHash}`);
  return callAiWithCache({
    ...input,
    modelId,
    requestHash,
    promptRecord: { text: input.prompt, imageCount: input.images.length },
    execute: () => (input.provider === "openai" ? callOpenAiVision(modelId, input.prompt, input.images) : callAnthropicVision(modelId, input.prompt, input.images))
  });
}

async function callAiWithCache(input: AiCallInput & {
  requestHash: string;
  promptRecord: Prisma.InputJsonValue;
  execute: () => Promise<string>;
}): Promise<AiCallResult> {
  const modelId = input.modelId ?? defaultModel(input.provider);
  const cached = await prisma.aiCacheEntry.findUnique({
    where: { signature: input.requestHash },
    include: { aiRequest: { include: { result: true } } }
  });

  if (cached?.aiRequest.result?.output) {
    const output = cached.aiRequest.result.output as { text?: string };
    if (output.text) return { provider: input.provider, modelId, text: output.text, requestId: cached.aiRequest.id };
  }

  const request = await prisma.aiRequest.create({
    data: {
      provider: input.provider,
      modelId,
      promptVersion: input.promptVersion,
      requestHash: input.requestHash,
      prompt: input.promptRecord,
      status: "running"
    }
  });

  try {
    const text = await input.execute();
    await prisma.aiResult.create({
      data: {
        aiRequestId: request.id,
        output: { text } as Prisma.InputJsonValue
      }
    });
    await prisma.aiCacheEntry.create({
      data: {
        signature: input.requestHash,
        aiRequestId: request.id,
        output: { text } as Prisma.InputJsonValue
      }
    });
    await prisma.aiRequest.update({ where: { id: request.id }, data: { status: "succeeded" } });
    return { provider: input.provider, modelId, text, requestId: request.id };
  } catch (error) {
    await prisma.aiResult.create({
      data: {
        aiRequestId: request.id,
        output: {},
        error: error instanceof Error ? error.message : "Unknown AI provider error"
      }
    });
    await prisma.aiRequest.update({ where: { id: request.id }, data: { status: "failed" } });
    throw error;
  }
}

export function extractJsonArray(text: string): unknown[] {
  const trimmed = text.trim();
  const direct = tryParseArray(trimmed);
  if (direct) return direct;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const parsed = tryParseArray(fenced[1].trim());
    if (parsed) return parsed;
  }

  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start >= 0 && end > start) {
    const parsed = tryParseArray(trimmed.slice(start, end + 1));
    if (parsed) return parsed;
  }

  throw new Error("AI response did not contain a JSON array.");
}

function defaultModel(provider: AiProvider): string {
  return provider === "openai" ? env.OPENAI_MODEL : env.ANTHROPIC_MODEL;
}

async function callOpenAi(model: string, prompt: string): Promise<string> {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature: 0.2
    })
  });

  const body = (await response.json()) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? "OpenAI request failed.");
  return body.output_text ?? body.output?.flatMap((item) => item.content ?? []).map((content) => content.text ?? "").join("\n").trim() ?? "";
}

async function callAnthropic(model: string, prompt: string): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured.");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const body = (await response.json()) as { content?: Array<{ type: string; text?: string }>; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? "Anthropic request failed.");
  return body.content?.map((content) => (content.type === "text" ? content.text ?? "" : "")).join("\n").trim() ?? "";
}

async function callOpenAiVision(model: string, prompt: string, images: AiImageInput[]): Promise<string> {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            ...images.map((image) => ({
              type: "input_image",
              image_url: `data:${image.mimeType ?? "image/jpeg"};base64,${image.base64}`
            }))
          ]
        }
      ],
      temperature: 0.1
    })
  });

  const body = (await response.json()) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? "OpenAI vision request failed.");
  return body.output_text ?? body.output?.flatMap((item) => item.content ?? []).map((content) => content.text ?? "").join("\n").trim() ?? "";
}

async function callAnthropicVision(model: string, prompt: string, images: AiImageInput[]): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured.");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 5000,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((image) => ({
              type: "image",
              source: {
                type: "base64",
                media_type: image.mimeType ?? "image/jpeg",
                data: image.base64
              }
            })),
            { type: "text", text: prompt }
          ]
        }
      ]
    })
  });

  const body = (await response.json()) as { content?: Array<{ type: string; text?: string }>; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? "Anthropic vision request failed.");
  return body.content?.map((content) => (content.type === "text" ? content.text ?? "" : "")).join("\n").trim() ?? "";
}

function tryParseArray(text: string): unknown[] | undefined {
  try {
    const parsed = JSON.parse(text) as unknown;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
