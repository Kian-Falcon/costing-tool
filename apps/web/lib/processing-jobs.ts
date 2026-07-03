import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "./auth";
import { prisma } from "./prisma";

export async function startProcessingJob(input: {
  type: string;
  user?: CurrentUser;
  fileId?: string;
  payload?: Prisma.InputJsonValue;
}) {
  return prisma.processingJob.create({
    data: {
      organizationId: input.user?.organizationId,
      userId: input.user?.id,
      fileId: input.fileId,
      type: input.type,
      status: "running",
      input: input.payload ?? {}
    }
  });
}

export async function completeProcessingJob(id: string, output?: Prisma.InputJsonValue) {
  await prisma.processingJob.update({
    where: { id },
    data: {
      status: "completed",
      output,
      completedAt: new Date()
    }
  });
}

export async function failProcessingJob(id: string, error: unknown) {
  await prisma.processingJob.update({
    where: { id },
    data: {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      completedAt: new Date()
    }
  });
}
