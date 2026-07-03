import { buildInternalCostingCsv, buildInternalCostingXlsx, type CostedBoqRow } from "@kf/importers";
import { buildInternalCostingPdf } from "../../../../lib/export-documents";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
import { completeExportJob, failExportJob, fileResponse, startExportJob, storeExportOutput } from "../../../../lib/export-jobs";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  rows: z.array(z.custom<CostedBoqRow>()),
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv")
});

export async function POST(request: Request) {
  let jobId: string | undefined;

  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const body = requestSchema.parse(await request.json());
    const job = await startExportJob("internal-costing", body.format, body.rows.length, user);
    jobId = job.id;

    if (body.format === "xlsx") {
      const buffer = buildInternalCostingXlsx(body.rows);
      const file = await storeExportOutput({ user, filename: "internal-costing.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: buffer });
      await completeExportJob(job.id, file.storageKey, file.id);
      return fileResponse(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "internal-costing.xlsx", job.id);
    }

    if (body.format === "pdf") {
      const buffer = await buildInternalCostingPdf(body.rows);
      const file = await storeExportOutput({ user, filename: "internal-costing.pdf", contentType: "application/pdf", body: buffer });
      await completeExportJob(job.id, file.storageKey, file.id);
      return fileResponse(buffer, "application/pdf", "internal-costing.pdf", job.id);
    }

    const csv = buildInternalCostingCsv(body.rows);
    const file = await storeExportOutput({ user, filename: "internal-costing.csv", contentType: "text/csv; charset=utf-8", body: csv });
    await completeExportJob(job.id, file.storageKey, file.id);
    return fileResponse(csv, "text/csv; charset=utf-8", "internal-costing.csv", job.id);
  } catch (error) {
    if (jobId) await failExportJob(jobId, error);
    return authJsonError(error);
  }
}
