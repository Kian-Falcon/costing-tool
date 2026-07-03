import { buildInternalCostingCsv, buildInternalCostingXlsx, type CostedBoqRow } from "@kf/importers";
import { buildInternalCostingPdf } from "../../../../lib/export-documents";
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
  const job = await startExportJob("internal-costing", body.format, body.rows.length);

  try {
    if (body.format === "xlsx") {
      await completeExportJob(job.id, "internal-costing.xlsx");
      return fileResponse(buildInternalCostingXlsx(body.rows), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "internal-costing.xlsx", job.id);
    }

    if (body.format === "pdf") {
      await completeExportJob(job.id, "internal-costing.pdf");
      return fileResponse(await buildInternalCostingPdf(body.rows), "application/pdf", "internal-costing.pdf", job.id);
    }

    await completeExportJob(job.id, "internal-costing.csv");
    return fileResponse(buildInternalCostingCsv(body.rows), "text/csv; charset=utf-8", "internal-costing.csv", job.id);
  } catch (error) {
    await failExportJob(job.id, error);
    throw error;
  }
}
