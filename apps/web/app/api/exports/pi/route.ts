import { buildPiCsv, buildPiXlsx, type CostedBoqRow } from "@kf/importers";
import { buildPiPdf } from "../../../../lib/export-documents";
import { completeExportJob, failExportJob, fileResponse, startExportJob } from "../../../../lib/export-jobs";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  rows: z.array(z.custom<CostedBoqRow>()),
  format: z.enum(["csv", "xlsx", "pdf"]).default("xlsx")
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const job = await startExportJob("pi", body.format, body.rows.length);

  try {
    if (body.format === "pdf") {
      await completeExportJob(job.id, "proforma-invoice.pdf");
      return fileResponse(await buildPiPdf(body.rows), "application/pdf", "proforma-invoice.pdf", job.id);
    }

    if (body.format === "csv") {
      await completeExportJob(job.id, "proforma-invoice.csv");
      return fileResponse(buildPiCsv(body.rows), "text/csv; charset=utf-8", "proforma-invoice.csv", job.id);
    }

    await completeExportJob(job.id, "proforma-invoice.xlsx");
    return fileResponse(buildPiXlsx(body.rows), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "proforma-invoice.xlsx", job.id);
  } catch (error) {
    await failExportJob(job.id, error);
    throw error;
  }
}
