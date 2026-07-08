import { buildPiCsv, buildPiXlsx, type CostedBoqRow } from "@kf/importers";
import { buildPiPdf } from "../../../../lib/export-documents";
import { downloadResponse } from "../../../../lib/download-response";
import { ZodError, z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  rows: z.array(z.custom<CostedBoqRow>()),
  format: z.enum(["csv", "xlsx", "pdf"]).default("xlsx"),
  meta: z.object({
    projectName: z.string().optional(),
    clientName: z.string().optional(),
    clientAddress: z.string().optional()
  }).optional()
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());

    if (body.format === "pdf") {
      const buffer = await buildPiPdf(body.rows, body.meta);
      return downloadResponse(buffer, "application/pdf", "proforma-invoice.pdf");
    }

    if (body.format === "csv") {
      const csv = buildPiCsv(body.rows);
      return downloadResponse(csv, "text/csv; charset=utf-8", "proforma-invoice.csv");
    }

    const buffer = buildPiXlsx(body.rows);
    return downloadResponse(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "proforma-invoice.xlsx");
  } catch (error) {
    const message = error instanceof ZodError ? "Invalid PI export data." : error instanceof Error ? error.message : "PI export failed.";
    return Response.json({ error: message }, { status: error instanceof ZodError ? 400 : 500 });
  }
}
