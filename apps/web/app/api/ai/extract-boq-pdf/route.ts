import { parseBoqRows } from "@kf/importers";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";
import { callAiText, extractJsonArray, type AiProvider } from "../../../../lib/ai-providers";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
import { env } from "../../../../lib/env";
import { storeUploadedFile } from "../../../../lib/file-storage";
import { completeProcessingJob, failProcessingJob, startProcessingJob } from "../../../../lib/processing-jobs";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Expected a PDF file field." }, { status: 400 });

    const provider = chooseProvider(String(form.get("provider") ?? ""));
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedFile = await storeUploadedFile({ user, filename: file.name, mimeType: file.type || "application/pdf", buffer, purpose: "pdf" });
    const job = await startProcessingJob({ type: "pdf-boq-extraction", user, fileId: uploadedFile.id, payload: { filename: file.name, provider: provider ?? "heuristic" } });
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const text = (parsed.text ?? "").trim();

    await prisma.pdfPage.create({
      data: {
        fileId: uploadedFile.id,
        pageNo: 1,
        text
      }
    });

    if (!text) {
      await failProcessingJob(job.id, "No text could be extracted from the PDF.");
      return NextResponse.json({ error: "No text could be extracted from the PDF.", fileId: uploadedFile.id, jobId: job.id }, { status: 422 });
    }

    if (!provider) {
      const fallbackRows = heuristicRows(text);
      const items = parseBoqRows(fallbackRows);
      await completeProcessingJob(job.id, { itemCount: items.length, mode: "heuristic" });
      return NextResponse.json({
        fileId: uploadedFile.id,
        jobId: job.id,
        status: "extracted_without_ai",
        warning: "Configure OPENAI_API_KEY or ANTHROPIC_API_KEY for structured PDF BOQ extraction.",
        textPreview: text.slice(0, 4000),
        items
      });
    }

    const prompt = buildPdfExtractionPrompt(text);
    try {
      const ai = await callAiText({ provider, prompt, promptVersion: "boq-pdf-extract-v1" });
      const rows = extractJsonArray(ai.text).map((row) => row as Record<string, unknown>);
      const items = parseBoqRows(rows);
      await completeProcessingJob(job.id, { itemCount: items.length, provider, aiRequestId: ai.requestId });
      return NextResponse.json({
        fileId: uploadedFile.id,
        jobId: job.id,
        provider,
        modelId: ai.modelId,
        aiRequestId: ai.requestId,
        rows,
        items,
        textPreview: text.slice(0, 2000)
      });
    } catch (error) {
      const fallbackRows = heuristicRows(text);
      await failProcessingJob(job.id, error);
      return NextResponse.json(
        {
          fileId: uploadedFile.id,
          jobId: job.id,
          error: error instanceof Error ? error.message : "AI PDF extraction failed.",
          textPreview: text.slice(0, 4000),
          fallbackItems: parseBoqRows(fallbackRows)
        },
        { status: 502 }
      );
    }
  } catch (error) {
    return authJsonError(error);
  }
}

function chooseProvider(value: string): AiProvider | undefined {
  if (value === "openai" && env.OPENAI_API_KEY) return "openai";
  if (value === "anthropic" && env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.OPENAI_API_KEY) return "openai";
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  return undefined;
}

function buildPdfExtractionPrompt(text: string): string {
  return `You are extracting a furniture BOQ from PDF text.
Return ONLY a JSON array. Each row must use these keys:
{"Code":"","Product Name":"","Dimensions":"","Specification":"","Qty":1}

Rules:
- Keep product names concise and manufacturing-facing.
- Put all material/finish notes in Specification.
- Preserve dimensions as written when possible.
- If quantity is missing, use 1.
- Ignore headers, footers, terms, totals, taxes, and page numbers.

PDF TEXT
================================================================================
${text.slice(0, 30000)}`;
}

function heuristicRows(text: string): Record<string, unknown>[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 10)
    .slice(0, 80)
    .map((line, index) => {
      const qtyMatch = line.match(/\bqty[:\s]+(\d+(?:\.\d+)?)/i) ?? line.match(/\s(\d+(?:\.\d+)?)\s*(?:nos|pcs|qty)\b/i);
      const dimsMatch = line.match(/\b\d{2,5}\s*[xX*]\s*\d{2,5}(?:\s*[xX*]\s*\d{2,5})?\b/);
      return {
        Code: String(index + 1),
        "Product Name": line.slice(0, 120),
        Dimensions: dimsMatch?.[0] ?? "",
        Specification: line,
        Qty: qtyMatch ? Number(qtyMatch[1]) : 1
      };
    });
}
