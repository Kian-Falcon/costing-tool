import type { CorpusProduct } from "@kf/shared";
import { EMBEDDED_CORPUS_PRODUCTS, EMBEDDED_TRAINING_LIBRARY_META } from "./embedded-training-library";
import { prisma } from "./prisma";

type OrgUser = {
  organizationId: string;
};

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

export async function ensureEmbeddedTrainingLibrary(user: OrgUser) {
  const existing = await prisma.trainingSource.findFirst({
    where: {
      organizationId: user.organizationId,
      filename: `embedded:${EMBEDDED_TRAINING_LIBRARY_META.sourceFile}`
    },
    select: { id: true }
  });

  if (existing) return { created: false, productCount: EMBEDDED_CORPUS_PRODUCTS.length };

  await prisma.trainingSource.create({
    data: {
      organizationId: user.organizationId,
      filename: `embedded:${EMBEDDED_TRAINING_LIBRARY_META.sourceFile}`,
      rowCount: EMBEDDED_TRAINING_LIBRARY_META.rowsRead,
      products: {
        create: EMBEDDED_CORPUS_PRODUCTS.map((product) => ({
          brand: product.brand,
          itemNo: product.itemno,
          productName: product.product,
          size: product.size,
          productType: product.ptype,
          constructionType: product.ct,
          lengthMm: product.L || undefined,
          widthMm: product.W || undefined,
          heightMm: product.H || undefined,
          planAreaSqm: product.area || undefined,
          totalInr: product._total || undefined,
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

  return { created: true, productCount: EMBEDDED_CORPUS_PRODUCTS.length };
}

export async function resetEmbeddedTrainingLibrary(user: OrgUser) {
  await prisma.trainingSource.deleteMany({
    where: {
      organizationId: user.organizationId,
      filename: `embedded:${EMBEDDED_TRAINING_LIBRARY_META.sourceFile}`
    }
  });
  await ensureEmbeddedTrainingLibrary(user);
  return loadCorpusProducts(user);
}

export async function loadCorpusProducts(user: OrgUser): Promise<CorpusProduct[]> {
  const products = await prisma.corpusProduct.findMany({
    where: { trainingSource: { organizationId: user.organizationId } },
    include: { materialQuantities: true, trainingSource: true },
    orderBy: { productName: "asc" }
  });

  return products.map((product) => {
    const item: CorpusProduct = {
      brand: product.brand ?? "",
      product: product.productName,
      itemno: product.itemNo ?? undefined,
      size: product.size,
      ptype: product.productType as CorpusProduct["ptype"],
      ct: product.constructionType ?? "",
      L: Number(product.lengthMm) || 0,
      W: Number(product.widthMm) || undefined,
      H: Number(product.heightMm) || undefined,
      area: Number(product.planAreaSqm) || 0,
      uph_area: 0,
      _total: Number(product.totalInr) || 0,
      sourceFile: product.trainingSource.filename
    };

    for (const material of product.materialQuantities) {
      item[material.materialKey] = Number(material.quantity);
    }

    return item;
  });
}

function unitFor(materialKey: string): string {
  if (materialKey.endsWith("_kg")) return "KG";
  if (materialKey.endsWith("_cft")) return "CFT";
  if (materialKey.endsWith("_mtr")) return "MTR";
  return "SFT";
}
