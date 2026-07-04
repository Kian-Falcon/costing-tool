import { NextResponse } from "next/server";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
import { EMBEDDED_TRAINING_LIBRARY_META } from "../../../../lib/embedded-training-library";
import { resetEmbeddedTrainingLibrary } from "../../../../lib/training-library-seed";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const products = await resetEmbeddedTrainingLibrary(user);
    return NextResponse.json({
      ok: true,
      products,
      count: products.length,
      meta: {
        embeddedSourceFile: EMBEDDED_TRAINING_LIBRARY_META.sourceFile,
        embeddedSourceFiles: EMBEDDED_TRAINING_LIBRARY_META.sourceFiles,
        embeddedSourceStats: EMBEDDED_TRAINING_LIBRARY_META.sourceStats,
        embeddedRowsRead: EMBEDDED_TRAINING_LIBRARY_META.rowsRead,
        embeddedRowsSkipped: EMBEDDED_TRAINING_LIBRARY_META.rowsSkipped
      }
    });
  } catch (error) {
    return authJsonError(error);
  }
}
