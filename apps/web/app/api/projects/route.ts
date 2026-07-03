import { type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authJsonError, requireRole, requireUser } from "../../../lib/auth";
import { dbBoqId, dbBoqItemId } from "../../../lib/default-org";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

const snapshotSchema = z
  .object({
    id: z.string().min(1),
    projectName: z.string().min(1),
    clientName: z.string().optional().default(""),
    savedAt: z.string().optional(),
    items: z.array(z.record(z.unknown())).default([]),
    costed: z.array(z.unknown()).default([])
  })
  .passthrough();

const saveProjectSchema = z.object({
  snapshot: snapshotSchema,
  itemCount: z.number().int().nonnegative().optional(),
  total: z.number().nonnegative().default(0)
});

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await prisma.project.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    return NextResponse.json({ projects: projects.map(toProjectArchive) });
  } catch (error) {
    return authJsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const body = saveProjectSchema.parse(await request.json());
    const savedAt = body.snapshot.savedAt ?? new Date().toISOString();
    const snapshot = { ...body.snapshot, savedAt };
    const boqId = dbBoqId(snapshot.id);
    const items = snapshot.items.map((item) => ({
    id: String(item.id ?? ""),
    code: optionalString(item.code),
    name: String(item.name ?? "Untitled item"),
    productType: String(item.ptype ?? "UNKNOWN"),
    constructionType: optionalString(item.ct),
    dimensions: String(item.dims ?? ""),
    quantity: numberValue(item.qty, 1),
    margin: numberValue(item.margin, 35),
    spec: optionalString(item.spec),
    aiSpec: optionalString(item.aiSpec),
    rawOverride: optionalNumber(item.rawOverride),
    manualFactory: optionalNumber(item.manualFac)
  })).filter((item) => item.id);

    const project = await prisma.$transaction(async (tx) => {
    const savedProject = await tx.project.upsert({
      where: { id: snapshot.id },
      create: {
        id: snapshot.id,
        organizationId: user.organizationId,
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

    await tx.boq.upsert({
      where: { id: boqId },
      create: {
        id: boqId,
        projectId: savedProject.id,
        title: snapshot.projectName
      },
      update: {
        title: snapshot.projectName
      }
    });

    const dbIds = items.map((item) => dbBoqItemId(savedProject.id, item.id));
    await tx.boqItem.deleteMany({
      where: {
        boqId,
        id: { notIn: dbIds.length ? dbIds : ["__none__"] }
      }
    });

    for (const item of items) {
      await tx.boqItem.upsert({
        where: { id: dbBoqItemId(savedProject.id, item.id) },
        create: {
          id: dbBoqItemId(savedProject.id, item.id),
          boqId,
          code: item.code,
          name: item.name,
          productType: item.productType,
          constructionType: item.constructionType,
          dimensions: item.dimensions,
          quantity: item.quantity,
          margin: item.margin,
          spec: item.spec,
          aiSpec: item.aiSpec,
          rawOverride: item.rawOverride,
          manualFactory: item.manualFactory
        },
        update: {
          code: item.code,
          name: item.name,
          productType: item.productType,
          constructionType: item.constructionType,
          dimensions: item.dimensions,
          quantity: item.quantity,
          margin: item.margin,
          spec: item.spec,
          aiSpec: item.aiSpec,
          rawOverride: item.rawOverride,
          manualFactory: item.manualFactory
        }
      });
    }

    return savedProject;
  });

    return NextResponse.json({ project: toProjectArchive(project) });
  } catch (error) {
    return authJsonError(error);
  }
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

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function optionalNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function numberValue(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
