import { buildCostingPrompt, costItem, findCorpusReferences } from "@kf/costing-engine";
import { type BoqItem, type CorpusProduct, type CostResult, type MaterialBreakdownLine, type RateItem, type RatioNorm, type TrainedModel } from "@kf/shared";
import { NextResponse } from "next/server";
import { z } from "zod";
import { callAiText, extractJsonArray } from "../../../../lib/ai-providers";
import { env } from "../../../../lib/env";

export const runtime = "nodejs";

const requestSchema = z.object({
  item: z.custom<BoqItem>(),
  rates: z.array(z.custom<RateItem>()).optional(),
  corpus: z.array(z.custom<CorpusProduct>()).optional(),
  models: z.array(z.custom<TrainedModel>()).optional(),
  ratioNorms: z.array(z.custom<RatioNorm>()).optional(),
  provider: z.enum(["seed", "anthropic", "openai"]).default("seed")
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const refs = findCorpusReferences({
    name: body.item.name,
    ptype: body.item.ptype,
    ct: body.item.ct ?? body.item.spec,
    dims: body.item.dims,
    corpus: body.corpus
  });

  if (body.provider !== "seed" && !env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "AI provider keys are not configured on the server.",
        prompt: buildCostingPrompt({
          item: body.item,
          rates: body.rates ?? [],
          refs,
          corpusCount: body.corpus?.length ?? 0,
          brandCount: new Set((body.corpus ?? []).map((product) => product.brand).filter(Boolean)).size
        })
      },
      { status: 503 }
    );
  }

  if (body.provider === "openai" || body.provider === "anthropic") {
    const prompt = buildCostingPrompt({
      item: body.item,
      rates: body.rates ?? [],
      refs,
      corpusCount: body.corpus?.length ?? 0,
      brandCount: new Set((body.corpus ?? []).map((product) => product.brand).filter(Boolean)).size
    });

    try {
      const ai = await callAiText({ provider: body.provider, prompt, promptVersion: "cost-item-v1" });
      const materials = materialLinesFromAi(extractJsonArray(ai.text));
      const result = buildAiCostResult({
        item: body.item,
        provider: body.provider,
        breakdown: materials,
        refs
      });

      return NextResponse.json({
        provider: body.provider,
        modelId: ai.modelId,
        aiRequestId: ai.requestId,
        result,
        rawMaterials: materials
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "AI costing failed.",
          seedResult: costItem({
            item: body.item,
            rates: body.rates,
            corpus: body.corpus,
            models: body.models,
            ratioNorms: body.ratioNorms
          }),
          prompt
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    provider: body.provider,
    result: costItem({
      item: body.item,
      rates: body.rates,
      corpus: body.corpus,
      models: body.models,
      ratioNorms: body.ratioNorms
    })
  });
}

function materialLinesFromAi(rows: unknown[]): MaterialBreakdownLine[] {
  return rows
    .flatMap((row) => {
      const value = row as Record<string, unknown>;
      const label = stringValue(value.material ?? value.label ?? value.name);
      const qty = numberValue(value.qty ?? value.quantity);
      const rate = numberValue(value.rate_inr ?? value.rate);
      if (!label || qty <= 0 || rate < 0) return [];
      const line: MaterialBreakdownLine = {
        materialKey: slug(label),
        label,
        qty,
        unit: stringValue(value.unit) || "NOS",
        rate,
        amount: roundMoney(qty * rate),
        source: "ai"
      };
      return [line];
    });
}

function buildAiCostResult(input: {
  item: BoqItem;
  provider: "anthropic" | "openai";
  breakdown: MaterialBreakdownLine[];
  refs: CostResult["refs"];
}): CostResult {
  const raw = roundMoney(input.breakdown.reduce((sum, line) => sum + line.amount, 0));
  const factory = roundMoney(input.item.manualFac ?? raw * 1.65);
  const margin = Math.min(85, Math.max(0, input.item.margin));
  const sell = roundMoney(factory / (1 - margin / 100));
  return {
    raw,
    factory,
    sell,
    total: roundMoney(sell * input.item.qty),
    confidence: input.breakdown.length ? 0.72 : 0.35,
    source: input.provider === "openai" ? "gpt4o" : "claude",
    breakdown: input.breakdown,
    refs: input.refs,
    matchLevel: input.refs[0] && input.refs[0].score > 0.85 ? "catalog" : input.refs[0] ? "similar" : "new",
    matchLabel: input.refs[0] ? `AI costed with anchor ${input.refs[0].product}` : "AI costed from prompt",
    matchScore: input.refs[0]?.score ?? 0
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "material";
}
