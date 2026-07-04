import { NextResponse } from "next/server";
import { authJsonError, requireUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 25)));
    const promptVersion = searchParams.get("promptVersion") || undefined;

    const logs = await prisma.aiRequest.findMany({
      where: promptVersion ? { promptVersion } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        provider: true,
        modelId: true,
        promptVersion: true,
        requestHash: true,
        status: true,
        createdAt: true,
        result: { select: { error: true, usage: true, createdAt: true, output: true } },
        cacheEntry: { select: { id: true, createdAt: true } }
      }
    });

    return NextResponse.json({
      summary: {
        requests: logs.length,
        succeeded: logs.filter((log) => log.status === "succeeded").length,
        failed: logs.filter((log) => log.status === "failed").length,
        cached: logs.filter((log) => log.cacheEntry).length
      },
      logs: logs.map((log) => ({
        id: log.id,
        provider: log.provider,
        modelId: log.modelId,
        promptVersion: log.promptVersion,
        requestHash: log.requestHash,
        status: log.status,
        createdAt: log.createdAt,
        hasOutput: Boolean(log.result?.output),
        error: log.result?.error ?? null,
        usage: log.result?.usage ?? null,
        cache: log.cacheEntry ? { id: log.cacheEntry.id, createdAt: log.cacheEntry.createdAt } : null
      }))
    });
  } catch (error) {
    return authJsonError(error);
  }
}
