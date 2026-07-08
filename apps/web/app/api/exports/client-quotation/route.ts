import { buildClientQuotationCsv, buildClientQuotationXlsx, type CostedBoqRow } from "@kf/importers";
import { buildClientQuotationPdf } from "../../../../lib/export-documents";
import { downloadResponse } from "../../../../lib/download-response";
import { ZodError, z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  rows: z.array(z.custom<CostedBoqRow>()),
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv"),
  meta: z.object({
    projectName: z.string().optional(),
    clientName: z.string().optional(),
    clientAddress: z.string().optional()
  }).optional()
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());

    if (body.format === "xlsx") {
      const buffer = buildClientQuotationXlsx(body.rows);
      return downloadResponse(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "client-quotation.xlsx");
    }

    if (body.format === "pdf") {
      const buffer = await buildClientQuotationPdf(body.rows, body.meta);
      return downloadResponse(buffer, "application/pdf", "client-quotation.pdf");
    }

    const csv = buildClientQuotationCsv(body.rows);
    return downloadResponse(csv, "text/csv; charset=utf-8", "client-quotation.csv");
  } catch (error) {
    const message = error instanceof ZodError ? "Invalid quotation export data." : error instanceof Error ? error.message : "Quotation export failed.";
    return Response.json({ error: message }, { status: error instanceof ZodError ? 400 : 500 });
  }
}
