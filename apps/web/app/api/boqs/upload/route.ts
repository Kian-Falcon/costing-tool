import { parseBoqCsv, parseBoqWorkbook } from "@kf/importers";
import { NextResponse } from "next/server";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
import { storeUploadedFile } from "../../../../lib/file-storage";
import { completeProcessingJob, startProcessingJob } from "../../../../lib/processing-jobs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Expected a file field." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    let items;
    if (name.endsWith(".csv")) {
      items = parseBoqCsv(buffer.toString("utf8"));
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      items = parseBoqWorkbook(buffer);
    } else {
      return NextResponse.json({ error: "Supported BOQ formats are CSV, XLSX, and XLS." }, { status: 415 });
    }

    const persistence = persistUploadedBoq({ user, filename: file.name, mimeType: file.type || mimeTypeFor(file.name), buffer, itemCount: items.length });
    const persisted = await withTimeout(persistence, 8000);
    return NextResponse.json({
      items,
      sourceFile: file.name,
      fileId: persisted?.fileId,
      jobId: persisted?.jobId,
      warning: persisted ? undefined : "BOQ rows loaded. File storage is still slow or unavailable, so the original upload was not linked yet."
    });
  } catch (error) {
    return authJsonError(error);
  }
}

async function persistUploadedBoq(input: {
  user: Awaited<ReturnType<typeof requireUser>>;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  itemCount: number;
}): Promise<{ fileId: string; jobId: string } | undefined> {
  try {
    const uploadedFile = await storeUploadedFile({ user: input.user, filename: input.filename, mimeType: input.mimeType, buffer: input.buffer, purpose: "boq" });
    const job = await startProcessingJob({ type: "boq-upload", user: input.user, fileId: uploadedFile.id, payload: { filename: input.filename, sizeBytes: input.buffer.byteLength } });
    await completeProcessingJob(job.id, { itemCount: input.itemCount });
    return { fileId: uploadedFile.id, jobId: job.id };
  } catch {
    return undefined;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(undefined), timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch(() => resolve(undefined))
      .finally(() => clearTimeout(timeout));
  });
}

function mimeTypeFor(filename: string): string {
  if (filename.toLowerCase().endsWith(".csv")) return "text/csv";
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}
