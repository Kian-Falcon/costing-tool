import { NextResponse } from "next/server";
import { z } from "zod";
import { authJsonError, requireRole, requireUser } from "../../../lib/auth";
import { EMBEDDED_TRAINING_LIBRARY_META } from "../../../lib/embedded-training-library";
import { prisma } from "../../../lib/prisma";
import { ensureEmbeddedTrainingLibrary, loadCorpusProducts } from "../../../lib/training-library-seed";

export const runtime = "nodejs";

const corpusProductSchema = z
  .object({
    brand: z.string().optional(),
    product: z.string().min(1),
    itemno: z.string().optional(),
    size: z.string().default(""),
    ptype: z.string().default("UNKNOWN"),
    ct: z.string().optional(),
    L: z.number().optional(),
    W: z.number().optional(),
    H: z.number().optional(),
    area: z.number().optional(),
    _total: z.number().optional(),
    sourceFile: z.string().default("api")
  })
  .passthrough();

const saveTrainingSchema = z.object({
  sourceFile: z.string().default("api"),
  rowsRead: z.number().int().nonnegative().default(0),
  products: z.array(corpusProductSchema)
});

const MATERIAL_KEYS = [
  "ply_sft",
  "foam_sft",
  "uph_mtr",
  "uph_sft",
  "metal_kg",
  "wood_cft",
  "wood_teak_cft",
  "wood_beech_cft",
  "wood_marandi_cft",
  "compact_sft",
  "veneer_sft",
  "lam_sft",
  "bal_sft",
  "polish_sft",
  "edge_mtr",
  "fevicol_sft"
];

export async function GET() {
  try {
    const user = await requireUser();
    const seed = await ensureEmbeddedTrainingLibrary(user);
    const sources = await prisma.trainingSource.findMany({
      where: { organizationId: user.organizationId },
      include: { products: true },
      orderBy: { importedAt: "desc" },
      take: 25
    });

    const products = await loadCorpusProducts(user);

    return NextResponse.json({
      meta: {
        embeddedCreated: seed.created,
        embeddedProductCount: seed.productCount,
        embeddedSourceFile: EMBEDDED_TRAINING_LIBRARY_META.sourceFile,
        embeddedSourceFiles: EMBEDDED_TRAINING_LIBRARY_META.sourceFiles,
        embeddedSourceStats: EMBEDDED_TRAINING_LIBRARY_META.sourceStats,
        embeddedRowsRead: EMBEDDED_TRAINING_LIBRARY_META.rowsRead,
        embeddedRowsSkipped: EMBEDDED_TRAINING_LIBRARY_META.rowsSkipped
      },
      products,
      sources: sources.map((source) => ({
        id: source.id,
        filename: source.filename,
        rowCount: source.rowCount,
        importedAt: source.importedAt,
        productCount: source.products.length
      }))
    });
  } catch (error) {
    return authJsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const body = saveTrainingSchema.parse(await request.json());
    const source = await prisma.trainingSource.create({
      data: {
        organizationId: user.organizationId,
        filename: body.sourceFile,
        rowCount: body.rowsRead,
        products: {
          create: body.products.map((product) => ({
            brand: product.brand ?? "",
            itemNo: product.itemno,
            productName: product.product,
            size: product.size,
            productType: product.ptype,
            constructionType: product.ct,
            lengthMm: product.L,
            widthMm: product.W,
            heightMm: product.H,
            planAreaSqm: product.area,
            totalInr: product._total,
            materialQuantities: {
              create: MATERIAL_KEYS.map((materialKey) => ({
                materialKey,
                quantity: Number(product[materialKey]) || 0,
                unit: unitFor(materialKey)
              })).filter((line) => line.quantity > 0)
            }
          }))
        }
      }
    });

    return NextResponse.json({ ok: true, id: source.id, count: body.products.length });
  } catch (error) {
    return authJsonError(error);
  }
}

function unitFor(materialKey: string): string {
  if (materialKey.endsWith("_kg")) return "KG";
  if (materialKey.endsWith("_cft")) return "CFT";
  if (materialKey.endsWith("_mtr")) return "MTR";
  return "SFT";
}
