import { parseMasterCostingRows, parseMasterCostingWorkbook } from "@kf/importers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
import { storeUploadedFile } from "../../../../lib/file-storage";
import { completeProcessingJob, startProcessingJob } from "../../../../lib/processing-jobs";

export const runtime = "nodejs";

const requestSchema = z.object({
  rows: z.array(z.record(z.unknown())),
  sourceFile: z.string().default("api")
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Expected a file field." }, { status: 400 });
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadedFile = await storeUploadedFile({ user, filename: file.name, mimeType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer, purpose: "training" });
      const job = await startProcessingJob({ type: "training-import", user, fileId: uploadedFile.id, payload: { filename: file.name, sizeBytes: buffer.byteLength } });
      const result = parseMasterCostingWorkbook(buffer, file.name);
      await completeProcessingJob(job.id, { rowsImported: result.rowsImported, rowsRead: result.rowsRead });
      return NextResponse.json({ ...result, fileId: uploadedFile.id, jobId: job.id });
    }

    const body = requestSchema.parse(await request.json());
    return NextResponse.json(parseMasterCostingRows(body.rows, body.sourceFile));
  } catch (error) {
    return authJsonError(error);
  }
}
