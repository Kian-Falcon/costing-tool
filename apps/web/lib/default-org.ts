import { prisma } from "./prisma";

export async function ensureDefaultOrganization() {
  const existing = await prisma.organization.findFirst({
    where: { name: "Kian Falcon" },
    orderBy: { createdAt: "asc" }
  });
  if (existing) return existing;
  return prisma.organization.create({ data: { name: "Kian Falcon" } });
}

export function dbBoqId(projectId: string): string {
  return `${projectId}__boq`;
}

export function dbBoqItemId(projectId: string, itemId: string): string {
  return `${projectId}__${itemId}`;
}
