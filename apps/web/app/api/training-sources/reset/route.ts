import { NextResponse } from "next/server";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
import { resetEmbeddedTrainingLibrary } from "../../../../lib/training-library-seed";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const products = await resetEmbeddedTrainingLibrary(user);
    return NextResponse.json({ ok: true, products, count: products.length });
  } catch (error) {
    return authJsonError(error);
  }
}
