import { parseBoqCsv, parseBoqWorkbook } from "@kf/importers";
import { NextResponse } from "next/server";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
import { storeUploadedFile } from "../../../../lib/file-storage";
import { completeProcessingJob, failProcessingJob, startProcessingJob } from "../../../../lib/processing-jobs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Expected a file field." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedFile = await storeUploadedFile({ user, filename: file.name, mimeType: file.type || mimeTypeFor(file.name), buffer, purpose: "boq" });
    const job = await startProcessingJob({ type: "boq-upload", user, fileId: uploadedFile.id, payload: { filename: file.name, sizeBytes: buffer.byteLength } });

    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      const items = parseBoqCsv(buffer.toString("utf8"));
      await completeProcessingJob(job.id, { itemCount: items.length });
      return NextResponse.json({ items, sourceFile: file.name, fileId: uploadedFile.id, jobId: job.id });
    }

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const items = parseBoqWorkbook(buffer);
      await completeProcessingJob(job.id, { itemCount: items.length });
      return NextResponse.json({ items, sourceFile: file.name, fileId: uploadedFile.id, jobId: job.id });
    }

    await failProcessingJob(job.id, "Unsupported BOQ format.");
    return NextResponse.json({ error: "Supported BOQ formats are CSV, XLSX, and XLS." }, { status: 415 });
  } catch (error) {
    return authJsonError(error);
  }
}

function mimeTypeFor(filename: string): string {
  if (filename.toLowerCase().endsWith(".csv")) return "text/csv";
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}
