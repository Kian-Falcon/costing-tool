import { prisma } from "./prisma";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export async function startExportJob(kind: string, format: ExportFormat, rowCount: number) {
  return prisma.exportJob.create({
    data: {
      kind,
      status: "running",
      input: { format, rowCount }
    }
  });
}

export async function completeExportJob(id: string, outputKey: string) {
  await prisma.exportJob.update({
    where: { id },
    data: { status: "completed", outputKey }
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
  return new Response(responseBody, {
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename=${filename}`,
      "x-export-job-id": jobId
    }
  });
}
