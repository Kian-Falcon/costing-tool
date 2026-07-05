import { buildPiCsv, buildPiXlsx, type CostedBoqRow } from "@kf/importers";
import { buildPiPdf } from "../../../../lib/export-documents";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
import { completeExportJob, failExportJob, fileResponse, startExportJob, storeExportOutput } from "../../../../lib/export-jobs";
import { z } from "zod";

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
  let jobId: string | undefined;

  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const body = requestSchema.parse(await request.json());
    try {
      const job = await startExportJob("pi", body.format, body.rows.length, user);
      jobId = job.id;
    } catch {
      // Export history is optional; the file download should still work.
    }

    if (body.format === "pdf") {
      const buffer = await buildPiPdf(body.rows, body.meta);
      await recordExportOutput(jobId, user, "proforma-invoice.pdf", "application/pdf", buffer);
      return fileResponse(buffer, "application/pdf", "proforma-invoice.pdf", jobId ?? "direct");
    }

    if (body.format === "csv") {
      const csv = buildPiCsv(body.rows);
      await recordExportOutput(jobId, user, "proforma-invoice.csv", "text/csv; charset=utf-8", csv);
      return fileResponse(csv, "text/csv; charset=utf-8", "proforma-invoice.csv", jobId ?? "direct");
    }

    const buffer = buildPiXlsx(body.rows);
    await recordExportOutput(jobId, user, "proforma-invoice.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer);
    return fileResponse(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "proforma-invoice.xlsx", jobId ?? "direct");
  } catch (error) {
    if (jobId) await failExportJob(jobId, error).catch(() => undefined);
    return authJsonError(error);
  }
}

async function recordExportOutput(jobId: string | undefined, user: Awaited<ReturnType<typeof requireUser>>, filename: string, contentType: string, body: Buffer | string) {
  if (!jobId) return;
  try {
    const file = await storeExportOutput({ user, filename, contentType, body });
    await completeExportJob(jobId, file.storageKey, file.id);
  } catch {
    // Storage is useful for history, but should not block a generated download.
  }
}
