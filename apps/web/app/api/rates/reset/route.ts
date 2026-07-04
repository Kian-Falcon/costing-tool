import { NextResponse } from "next/server";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
import { resetEmbeddedRateLibrary } from "../../../../lib/rate-library-seed";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const result = await resetEmbeddedRateLibrary(user);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return authJsonError(error);
  }
}
