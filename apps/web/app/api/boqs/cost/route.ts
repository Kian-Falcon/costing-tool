import { costItem, rebuildModelsFromCorpus, rebuildRatioNorms } from "@kf/costing-engine";
import { type BoqItem, type CorpusProduct, type RateItem, type RatioNorm, type TrainedModel } from "@kf/shared";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  items: z.array(z.custom<BoqItem>()),
  rates: z.array(z.custom<RateItem>()).optional(),
  corpus: z.array(z.custom<CorpusProduct>()).optional(),
  models: z.array(z.custom<TrainedModel>()).optional(),
  ratioNorms: z.array(z.custom<RatioNorm>()).optional()
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const models = body.models ?? rebuildModelsFromCorpus(body.corpus ?? []);
  const ratioNorms = body.ratioNorms ?? rebuildRatioNorms(body.corpus ?? []);

  return NextResponse.json({
    items: body.items.map((item) => ({
      item,
      result: costItem({ item, rates: body.rates, corpus: body.corpus, models, ratioNorms })
    })),
    meta: {
      modelCount: models.length,
      ratioNormCount: ratioNorms.length
    }
  });
}
