import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await prisma.exportJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      kind: true,
      status: true,
      input: true,
      outputKey: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return NextResponse.json({ jobs });
}
