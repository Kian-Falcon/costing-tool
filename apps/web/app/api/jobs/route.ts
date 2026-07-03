import { NextResponse } from "next/server";
import { authJsonError, requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const jobs = await prisma.processingJob.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { file: { select: { id: true, filename: true, storageKey: true, provider: true } } }
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    return authJsonError(error);
  }
}
