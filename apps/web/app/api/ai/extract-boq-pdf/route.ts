import { NextResponse } from "next/server";
import { env } from "../../../../lib/env";

export const runtime = "nodejs";

export async function POST() {
  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Configure a server-side AI provider key before PDF extraction." }, { status: 503 });
  }

  return NextResponse.json({ jobId: "pending-provider-integration", status: "queued" }, { status: 202 });
}
