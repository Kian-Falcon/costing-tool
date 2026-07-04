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

    const mode = String(form.get("mode") ?? "spec-book");
    const provider = chooseProvider(String(form.get("provider") ?? ""));
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedFile = await storeUploadedFile({ user, filename: file.name, mimeType: file.type || "application/pdf", buffer, purpose: "pdf" });
    const job = await startProcessingJob({ type: `${mode}-pdf-extraction`, user, fileId: uploadedFile.id, payload: { filename: file.name, provider: provider ?? "heuristic" } });

    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const text = (parsed.text ?? "").trim();

    await prisma.pdfPage.create({ data: { fileId: uploadedFile.id, pageNo: 1, text } });

    if (!text) {
      await failProcessingJob(job.id, "No text could be extracted from the PDF.");
      return NextResponse.json({ error: "No text could be extracted from the PDF.", fileId: uploadedFile.id, jobId: job.id }, { status: 422 });
    }

    if (!provider) {
      const sections = heuristicSections(text);
      await completeProcessingJob(job.id, { itemCount: sections.length, mode: "heuristic" });
      return NextResponse.json({
        fileId: uploadedFile.id,
        jobId: job.id,
        status: "extracted_without_ai",
        warning: "Configure OPENAI_API_KEY or ANTHROPIC_API_KEY for structured spec/PI extraction.",
        sections,
        textPreview: text.slice(0, 4000)
      });
    }

    try {
      const ai = await callAiText({ provider, prompt: buildSpecExtractionPrompt(text, mode), promptVersion: `spec-pi-pdf-extract-v1:${mode}` });
      const sections = extractJsonArray(ai.text);
      await completeProcessingJob(job.id, { itemCount: sections.length, provider, aiRequestId: ai.requestId });
      return NextResponse.json({ fileId: uploadedFile.id, jobId: job.id, provider, modelId: ai.modelId, aiRequestId: ai.requestId, sections });
    } catch (error) {
      const sections = heuristicSections(text);
      await failProcessingJob(job.id, error);
      return NextResponse.json(
        {
          fileId: uploadedFile.id,
          jobId: job.id,
          error: error instanceof Error ? error.message : "AI spec/PI extraction failed.",
          fallbackSections: sections,
          textPreview: text.slice(0, 4000)
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

function buildSpecExtractionPrompt(text: string, mode: string): string {
  return `You are extracting ${mode === "pi" ? "proforma invoice" : "furniture specification book"} data from PDF text.
Return ONLY a JSON array. Each row must use these keys:
{"section":"","itemCode":"","itemName":"","dimensions":"","specification":"","finish":"","quantity":1,"unit":"","amount":0}

Rules:
- Preserve furniture material, finish, hardware, upholstery, and installation notes.
- Use amount only when an explicit commercial amount is present.
- If quantity is missing, use 1.
- Ignore headers, footers, page numbers, bank details, and generic terms.

PDF TEXT
================================================================================
${text.slice(0, 30000)}`;
}

function heuristicSections(text: string): Record<string, unknown>[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 8 && !/^(page\s+\d+|terms|conditions|bank details)$/i.test(line))
    .slice(0, 160)
    .map((line, index) => {
      const dims = line.match(/\b\d{2,5}\s*(?:mm)?\s*[xX*]\s*\d{2,5}\s*(?:mm)?(?:\s*[xX*]\s*\d{2,5}\s*(?:mm)?)?\b/)?.[0] ?? "";
      const qty = Number((line.match(/\bqty[:\s]+(\d+(?:\.\d+)?)/i) ?? line.match(/\b(\d+(?:\.\d+)?)\s*(?:nos|pcs)\b/i))?.[1] ?? 1);
      const amount = Number(line.match(/(?:rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i)?.[1]?.replace(/,/g, "") ?? 0);
      return {
        section: line.match(/^(chapter|section|part)\s+[^:]+/i)?.[0] ?? "",
        itemCode: line.match(/^\s*([A-Z]{1,4}[-/]\d{1,5}|\d{1,3})\b/)?.[1] ?? String(index + 1),
        itemName: line.replace(dims, "").slice(0, 140),
        dimensions: dims,
        specification: line,
        finish: finishFromLine(line),
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        unit: /\b(rmt|mtr)\b/i.test(line) ? "MTR" : "NOS",
        amount: Number.isFinite(amount) ? amount : 0
      };
    });
}

function finishFromLine(line: string): string {
  return line.match(/\b(laminate|veneer|polish|powder coat|paint|fabric|leatherette|solid surface|stone)\b[^.;,]*/i)?.[0] ?? "";
}
