import { EMBEDDED_RM_RATES, EMBEDDED_VENDOR_LINKS } from "./embedded-rate-library";
import { prisma } from "./prisma";

type OrgUser = {
  organizationId: string;
};

export async function ensureEmbeddedRateLibrary(user: OrgUser) {
  const existing = await prisma.rateItem.findMany({
    where: { organizationId: user.organizationId },
    select: { key: true }
  });
  const existingKeys = new Set(existing.map((rate) => rate.key));
  const missingRates = EMBEDDED_RM_RATES.filter((rate) => !existingKeys.has(rate.key));

  if (!missingRates.length) return { created: 0, totalEmbedded: EMBEDDED_RM_RATES.length };

  await prisma.rateItem.createMany({
    data: missingRates.map((rate) => ({
      organizationId: user.organizationId,
      key: rate.key,
      label: rate.label,
      rate: rate.rate,
      unit: rate.unit,
      category: rate.category,
      source: `embedded:${rate.source}`,
      custom: false
    })),
    skipDuplicates: true
  });

  return { created: missingRates.length, totalEmbedded: EMBEDDED_RM_RATES.length };
}

export async function ensureEmbeddedVendorDirectory(user: OrgUser) {
  await ensureEmbeddedRateLibrary(user);

  const vendorCount = await prisma.vendor.count({ where: { organizationId: user.organizationId } });
  if (vendorCount > 0) return { created: 0, totalEmbedded: EMBEDDED_VENDOR_LINKS.length };

  const rateItems = await prisma.rateItem.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true, key: true }
  });
  const rateIdByKey = new Map(rateItems.map((rate) => [rate.key, rate.id]));
  let created = 0;

  for (const link of EMBEDDED_VENDOR_LINKS) {
    const vendor = await prisma.vendor.upsert({
      where: { id: vendorId(user.organizationId, link.name) },
      create: {
        id: vendorId(user.organizationId, link.name),
        organizationId: user.organizationId,
        name: link.name
      },
      update: {
        name: link.name
      }
    });

    await prisma.vendorMaterial.upsert({
      where: { id: vendorMaterialId(vendor.id, link.materialName, link.rateKey) },
      create: {
        id: vendorMaterialId(vendor.id, link.materialName, link.rateKey),
        vendorId: vendor.id,
        rateItemId: rateIdByKey.get(link.rateKey),
        materialName: link.materialName
      },
      update: {
        rateItemId: rateIdByKey.get(link.rateKey),
        materialName: link.materialName
      }
    });
    created += 1;
  }

  return { created, totalEmbedded: EMBEDDED_VENDOR_LINKS.length };
}

function vendorId(organizationId: string, name: string): string {
  return `${organizationId}__${slug(name)}`;
}

function vendorMaterialId(vendorIdValue: string, materialName: string, rateKey: string): string {
  return `${vendorIdValue}__${slug(materialName)}__${slug(rateKey)}`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "item";
}
