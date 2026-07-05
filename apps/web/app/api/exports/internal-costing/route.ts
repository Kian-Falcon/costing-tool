import { buildInternalCostingCsv, buildInternalCostingXlsx, type CostedBoqRow } from "@kf/importers";
import { buildInternalCostingPdf } from "../../../../lib/export-documents";
import { authJsonError, getCurrentUser } from "../../../../lib/auth";
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
    const body = requestSchema.parse(await request.json());
    const user = await getCurrentUser().catch(() => null);
    try {
      const job = await startExportJob("internal-costing", body.format, body.rows.length, user ?? undefined);
      jobId = job.id;
    } catch {
      // Export history is optional; the file download should still work.
    }

    if (body.format === "xlsx") {
      const buffer = buildInternalCostingXlsx(body.rows);
      await recordExportOutput(jobId, user ?? undefined, "internal-costing.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer);
      return fileResponse(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "internal-costing.xlsx", jobId ?? "direct");
    }

    if (body.format === "pdf") {
      const buffer = await buildInternalCostingPdf(body.rows, body.meta);
      await recordExportOutput(jobId, user ?? undefined, "internal-costing.pdf", "application/pdf", buffer);
      return fileResponse(buffer, "application/pdf", "internal-costing.pdf", jobId ?? "direct");
    }

    const csv = buildInternalCostingCsv(body.rows);
    await recordExportOutput(jobId, user ?? undefined, "internal-costing.csv", "text/csv; charset=utf-8", csv);
    return fileResponse(csv, "text/csv; charset=utf-8", "internal-costing.csv", jobId ?? "direct");
  } catch (error) {
    if (jobId) await failExportJob(jobId, error).catch(() => undefined);
    return authJsonError(error);
  }
}

async function recordExportOutput(jobId: string | undefined, user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> | undefined, filename: string, contentType: string, body: Buffer | string) {
  if (!jobId) return;
  try {
    const file = await storeExportOutput({ user: user ?? undefined, filename, contentType, body });
    await completeExportJob(jobId, file.storageKey, file.id);
  } catch {
    // Storage is useful for history, but should not block a generated download.
  }
}
