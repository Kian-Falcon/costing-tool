import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null, warning: "Authentication database is unavailable." });
  }
}
