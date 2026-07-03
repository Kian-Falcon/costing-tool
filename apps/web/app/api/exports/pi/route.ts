import { buildPiCsv, buildPiXlsx, type CostedBoqRow } from "@kf/importers";
import { buildPiPdf } from "../../../../lib/export-documents";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
import { completeExportJob, failExportJob, fileResponse, startExportJob, storeExportOutput } from "../../../../lib/export-jobs";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  rows: z.array(z.custom<CostedBoqRow>()),
  format: z.enum(["csv", "xlsx", "pdf"]).default("xlsx")
});

export async function POST(request: Request) {
  let jobId: string | undefined;

  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const body = requestSchema.parse(await request.json());
    const job = await startExportJob("pi", body.format, body.rows.length, user);
    jobId = job.id;

    if (body.format === "pdf") {
      const buffer = await buildPiPdf(body.rows);
      const file = await storeExportOutput({ user, filename: "proforma-invoice.pdf", contentType: "application/pdf", body: buffer });
      await completeExportJob(job.id, file.storageKey, file.id);
      return fileResponse(buffer, "application/pdf", "proforma-invoice.pdf", job.id);
    }

    if (body.format === "csv") {
      const csv = buildPiCsv(body.rows);
      const file = await storeExportOutput({ user, filename: "proforma-invoice.csv", contentType: "text/csv; charset=utf-8", body: csv });
      await completeExportJob(job.id, file.storageKey, file.id);
      return fileResponse(csv, "text/csv; charset=utf-8", "proforma-invoice.csv", job.id);
    }

    const buffer = buildPiXlsx(body.rows);
    const file = await storeExportOutput({ user, filename: "proforma-invoice.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: buffer });
    await completeExportJob(job.id, file.storageKey, file.id);
    return fileResponse(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "proforma-invoice.xlsx", job.id);
  } catch (error) {
    if (jobId) await failExportJob(jobId, error);
    return authJsonError(error);
  }
}
