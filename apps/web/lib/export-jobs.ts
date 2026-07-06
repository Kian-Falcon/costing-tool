import { prisma } from "./prisma";
import type { CurrentUser } from "./auth";
import { writeExportFile } from "./file-storage";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export async function startExportJob(kind: string, format: ExportFormat, rowCount: number, user?: CurrentUser) {
  return prisma.exportJob.create({
    data: {
      organizationId: user?.organizationId,
      userId: user?.id,
      kind,
      status: "running",
      input: { format, rowCount }
    }
  });
}

export async function completeExportJob(id: string, outputKey: string, fileId?: string) {
  await prisma.exportJob.update({
    where: { id },
    data: { status: "completed", outputKey, fileId }
  });
}

export async function failExportJob(id: string, error: unknown) {
  await prisma.exportJob.update({
    where: { id },
    data: {
      status: "failed",
      input: { error: error instanceof Error ? error.message : String(error) }
    }
  });
}

export function fileResponse(body: Buffer | string, contentType: string, filename: string, jobId: string): Response {
  const responseBody = typeof body === "string" ? body : new Uint8Array(body);
  const contentLength = typeof body === "string" ? Buffer.byteLength(body, "utf8") : body.byteLength;
  return new Response(responseBody, {
    headers: {
      "content-type": contentType,
      "content-length": String(contentLength),
      "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "x-export-job-id": jobId
    }
  });
}

export async function storeExportOutput(input: {
  user?: CurrentUser;
  filename: string;
  contentType: string;
  body: Buffer | string;
}) {
  const buffer = typeof input.body === "string" ? Buffer.from(input.body, "utf8") : input.body;
  return writeExportFile({
    user: input.user,
    filename: input.filename,
    mimeType: input.contentType,
    buffer
  });
}
