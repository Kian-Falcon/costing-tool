import { buildCostingPrompt, costItem, findCorpusReferences } from "@kf/costing-engine";
import { type BoqItem, type CorpusProduct, type RateItem, type RatioNorm, type TrainedModel } from "@kf/shared";
import { NextResponse } from "next/server";
import { z } from "zod";
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

  if (body.provider !== "seed" && !env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) {
    const refs = findCorpusReferences({
      name: body.item.name,
      ptype: body.item.ptype,
      ct: body.item.ct ?? body.item.spec,
      dims: body.item.dims,
      corpus: body.corpus
    });
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
