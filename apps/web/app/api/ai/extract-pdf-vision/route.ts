import { parseBoqRows } from "@kf/importers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { callAiVision, extractJsonArray, type AiImageInput, type AiProvider } from "../../../../lib/ai-providers";
import { env } from "../../../../lib/env";

export const runtime = "nodejs";

const imageSchema = z.object({
  page: z.number().optional(),
  base64: z.string().min(100),
  mimeType: z.string().optional()
});

const requestSchema = z.object({
  mode: z.enum(["boq", "boq-enrichment", "spec-book", "pi"]).default("boq"),
  filename: z.string().optional(),
  provider: z.enum(["openai", "anthropic"]).optional(),
  pageImages: z.array(imageSchema).min(1).max(8),
  rows: z.array(z.record(z.unknown())).optional()
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const provider = chooseProvider(body.provider);
    if (!provider) {
      return NextResponse.json({ error: "Configure OPENAI_API_KEY or ANTHROPIC_API_KEY for PDF vision extraction." }, { status: 400 });
    }

    const images = body.pageImages.map((image) => ({ base64: image.base64, mimeType: image.mimeType ?? "image/jpeg" })) satisfies AiImageInput[];
    const prompt = buildPrompt(body.mode, body.filename ?? "Uploaded PDF", body.rows ?? []);
    const ai = await callAiVision({ provider, images, prompt, promptVersion: `pdf-vision-v2:${body.mode}` });
    const rows = extractJsonArray(ai.text);

    if (body.mode === "boq") {
      const tableRows = rows.map((row) => row as Record<string, unknown>);
      return NextResponse.json({
        provider,
        modelId: ai.modelId,
        aiRequestId: ai.requestId,
        rows: tableRows,
        items: parseBoqRows(tableRows)
      });
    }

    if (body.mode === "boq-enrichment") {
      return NextResponse.json({
        provider,
        modelId: ai.modelId,
        aiRequestId: ai.requestId,
        enrichments: rows
      });
    }

    return NextResponse.json({
      provider,
      modelId: ai.modelId,
      aiRequestId: ai.requestId,
      sections: rows
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF vision extraction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function chooseProvider(requested?: AiProvider): AiProvider | undefined {
  if (requested === "openai" && env.OPENAI_API_KEY) return "openai";
  if (requested === "anthropic" && env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.OPENAI_API_KEY) return "openai";
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  return undefined;
}

function buildPrompt(mode: "boq" | "boq-enrichment" | "spec-book" | "pi", filename: string, rows: Record<string, unknown>[]): string {
  if (mode === "boq-enrichment") return buildEnrichmentPrompt(filename, rows);
  if (mode === "spec-book" || mode === "pi") return buildSpecPrompt(mode, filename);
  return buildBoqPrompt(filename);
}

function buildBoqPrompt(filename: string): string {
  return `You are reading a furniture BOQ PDF for Kian Falcon.
The attached images are rendered pages from: ${filename}

Return ONLY a valid JSON array of objects. Use these keys exactly:
{
  "Code":"",
  "Product Name":"",
  "Original Specification":"",
  "AI Enriched Spec":"",
  "Dimensions":"",
  "Qty":1,
  "Construction Type":"",
  "Raw Material":"",
  "Dims Source":"schedule|drawing|missing",
  "Image BBox":"{\\"page\\":1,\\"x\\":12,\\"y\\":18,\\"w\\":8,\\"h\\":7}"
}

Rules:
- Extract one row per physical furniture item.
- Ignore commercial rows: totals, GST, payment terms, transportation, packaging, warranty, penalty.
- Product Name must be the item name only, not dimensions or full specification.
- Original Specification is copied from the document text.
- AI Enriched Spec should add visible/inferred missing details from the image: frame material, substrate, finish, upholstery, foam, shelves, drawers, base style.
- Construction Type should be a compact manufacturing phrase such as "MS + MDF + LAMINATE" or "ASHWOOD + UPHOLSTERED".
- Preserve dimensions as written when visible. If dimensions are measured from a drawing rather than a schedule, set Dims Source to "drawing". If missing, set "missing".
- Image BBox is optional. When a thumbnail/photo is visible, return a JSON string bounding box in page percent coordinates.
- Return JSON only. No markdown.`;
}

function buildEnrichmentPrompt(filename: string, rows: Record<string, unknown>[]): string {
  const tableText = rows
    .slice(0, 120)
    .map((row, index) => `${index + 1}. ${Object.entries(row).map(([key, value]) => `${key}: ${String(value ?? "").slice(0, 220)}`).join(" | ")}`)
    .join("\n");

  return `You are enriching already extracted furniture BOQ rows using PDF page images.
Source: ${filename}

Rows:
${tableText}

Return ONLY a JSON array of objects:
{
  "row":1,
  "missing_spec":"",
  "inferred_ct":"",
  "inferred_dims":"",
  "dims_source":"schedule|drawing|missing",
  "image_bbox":"{\\"page\\":1,\\"x\\":12,\\"y\\":18,\\"w\\":8,\\"h\\":7}"
}

Rules:
- row is the 1-based row number from the Rows list.
- Fill missing_spec with only useful material/finish/construction details that are missing or weak in the row text.
- Infer CT from visual/spec evidence, e.g. "MS + MDF + LAMINATE", "ASHWOOD + UPHOLSTERED".
- If dimensions are absent but visible in drawing/schedule, provide inferred_dims.
- Keep rows with no useful improvement out of the array.
- Return JSON only.`;
}

function buildSpecPrompt(mode: "spec-book" | "pi", filename: string): string {
  return `You are extracting a ${mode === "pi" ? "proforma invoice" : "furniture specification book"} from PDF page images.
Source: ${filename}

Return ONLY a valid JSON array of objects using these keys:
{"section":"","itemCode":"","itemName":"","dimensions":"","specification":"","finish":"","quantity":1,"unit":"NOS","amount":0}

Rules:
- Preserve material, finish, upholstery, hardware, image-visible notes, and dimensions.
- Use amount only when a commercial amount is explicitly shown.
- If quantity is missing, use 1.
- Ignore headers, footers, page numbers, bank details, and generic terms.
- Return JSON only.`;
}
