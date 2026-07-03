import { type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

const snapshotSchema = z
  .object({
    id: z.string().min(1),
    projectName: z.string().min(1),
    clientName: z.string().optional().default(""),
    savedAt: z.string().optional(),
    items: z.array(z.unknown()).default([]),
    costed: z.array(z.unknown()).default([])
  })
  .passthrough();

const saveProjectSchema = z.object({
  snapshot: snapshotSchema,
  itemCount: z.number().int().nonnegative().optional(),
  total: z.number().nonnegative().default(0)
});

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100
  });

  return NextResponse.json({ projects: projects.map(toProjectArchive) });
}

export async function POST(request: Request) {
  const body = saveProjectSchema.parse(await request.json());
  const organization = await ensureDefaultOrganization();
  const savedAt = body.snapshot.savedAt ?? new Date().toISOString();
  const snapshot = { ...body.snapshot, savedAt };

  const project = await prisma.project.upsert({
    where: { id: snapshot.id },
    create: {
      id: snapshot.id,
      organizationId: organization.id,
      name: snapshot.projectName,
      clientName: snapshot.clientName || null,
      snapshot: snapshot as Prisma.InputJsonValue,
      itemCount: body.itemCount ?? snapshot.items.length,
      totalInr: body.total
    },
    update: {
      name: snapshot.projectName,
      clientName: snapshot.clientName || null,
      snapshot: snapshot as Prisma.InputJsonValue,
      itemCount: body.itemCount ?? snapshot.items.length,
      totalInr: body.total
    }
  });

  return NextResponse.json({ project: toProjectArchive(project) });
}

async function ensureDefaultOrganization() {
  const existing = await prisma.organization.findFirst({
    where: { name: "Kian Falcon" },
    orderBy: { createdAt: "asc" }
  });
  if (existing) return existing;
  return prisma.organization.create({ data: { name: "Kian Falcon" } });
}

function toProjectArchive(project: {
  id: string;
  name: string;
  clientName: string | null;
  snapshot: Prisma.JsonValue | null;
  itemCount: number;
  totalInr: unknown;
  updatedAt: Date;
}) {
  const fallbackSnapshot = {
    version: 2,
    id: project.id,
    projectName: project.name,
    clientName: project.clientName ?? "",
    savedAt: project.updatedAt.toISOString(),
    imports: { corpus: [], rates: [], vendors: [], trainingRows: 0, rateRows: 0 },
    items: [],
    costed: [],
    message: "Loaded project from database."
  };
  const snapshot = (project.snapshot ?? fallbackSnapshot) as typeof fallbackSnapshot;

  return {
    id: project.id,
    name: project.name,
    clientName: project.clientName ?? "",
    savedAt: snapshot.savedAt ?? project.updatedAt.toISOString(),
    itemCount: project.itemCount,
    total: Number(project.totalInr ?? 0),
    snapshot
  };
}
