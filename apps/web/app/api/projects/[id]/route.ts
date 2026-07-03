import { type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const project = await prisma.project.findFirst({
      where: { id: context.params.id, organizationId: user.organizationId }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ project: toProjectArchive(project) });
  } catch (error) {
    return authJsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    await prisma.project.deleteMany({
      where: { id: context.params.id, organizationId: user.organizationId }
    });
  } catch (error) {
    return authJsonError(error);
  }

  return NextResponse.json({ ok: true });
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
