import { buildInternalCostingCsv, buildInternalCostingXlsx, type CostedBoqRow } from "@kf/importers";
import { buildInternalCostingPdf } from "../../../../lib/export-documents";
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
      const buffer = buildInternalCostingXlsx(body.rows);
      return downloadResponse(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "internal-costing.xlsx");
    }

    if (body.format === "pdf") {
      const buffer = await buildInternalCostingPdf(body.rows, body.meta);
      return downloadResponse(buffer, "application/pdf", "internal-costing.pdf");
    }

    const csv = buildInternalCostingCsv(body.rows);
    return downloadResponse(csv, "text/csv; charset=utf-8", "internal-costing.csv");
  } catch (error) {
    const message = error instanceof ZodError ? "Invalid internal costing export data." : error instanceof Error ? error.message : "Internal costing export failed.";
    return Response.json({ error: message }, { status: error instanceof ZodError ? 400 : 500 });
  }
}
