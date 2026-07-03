import { buildClientQuotationCsv, buildClientQuotationXlsx, type CostedBoqRow } from "@kf/importers";
import { buildClientQuotationPdf } from "../../../../lib/export-documents";
import { completeExportJob, failExportJob, fileResponse, startExportJob } from "../../../../lib/export-jobs";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  rows: z.array(z.custom<CostedBoqRow>()),
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv")
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const job = await startExportJob("client-quotation", body.format, body.rows.length);

  try {
    if (body.format === "xlsx") {
      await completeExportJob(job.id, "client-quotation.xlsx");
      return fileResponse(buildClientQuotationXlsx(body.rows), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "client-quotation.xlsx", job.id);
    }

    if (body.format === "pdf") {
      await completeExportJob(job.id, "client-quotation.pdf");
      return fileResponse(await buildClientQuotationPdf(body.rows), "application/pdf", "client-quotation.pdf", job.id);
    }

    await completeExportJob(job.id, "client-quotation.csv");
    return fileResponse(buildClientQuotationCsv(body.rows), "text/csv; charset=utf-8", "client-quotation.csv", job.id);
  } catch (error) {
    await failExportJob(job.id, error);
    throw error;
  }
}
