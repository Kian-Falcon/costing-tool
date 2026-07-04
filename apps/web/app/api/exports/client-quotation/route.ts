import { buildClientQuotationCsv, buildClientQuotationXlsx, type CostedBoqRow } from "@kf/importers";
import { buildClientQuotationPdf } from "../../../../lib/export-documents";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
import { completeExportJob, failExportJob, fileResponse, startExportJob, storeExportOutput } from "../../../../lib/export-jobs";
import { z } from "zod";

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
  let jobId: string | undefined;

  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const body = requestSchema.parse(await request.json());
    const job = await startExportJob("client-quotation", body.format, body.rows.length, user);
    jobId = job.id;

    if (body.format === "xlsx") {
      const buffer = buildClientQuotationXlsx(body.rows);
      const file = await storeExportOutput({ user, filename: "client-quotation.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: buffer });
      await completeExportJob(job.id, file.storageKey, file.id);
      return fileResponse(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "client-quotation.xlsx", job.id);
    }

    if (body.format === "pdf") {
      const buffer = await buildClientQuotationPdf(body.rows, body.meta);
      const file = await storeExportOutput({ user, filename: "client-quotation.pdf", contentType: "application/pdf", body: buffer });
      await completeExportJob(job.id, file.storageKey, file.id);
      return fileResponse(buffer, "application/pdf", "client-quotation.pdf", job.id);
    }

    const csv = buildClientQuotationCsv(body.rows);
    const file = await storeExportOutput({ user, filename: "client-quotation.csv", contentType: "text/csv; charset=utf-8", body: csv });
    await completeExportJob(job.id, file.storageKey, file.id);
    return fileResponse(csv, "text/csv; charset=utf-8", "client-quotation.csv", job.id);
  } catch (error) {
    if (jobId) await failExportJob(jobId, error);
    return authJsonError(error);
  }
}
