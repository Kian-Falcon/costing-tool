import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDefaultOrganization } from "../../../lib/default-org";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

const vendorLinkSchema = z.object({
  name: z.string().min(1),
  materialName: z.string().min(1),
  rateKey: z.string().min(1)
});

const saveVendorsSchema = z.object({
  vendors: z.array(vendorLinkSchema)
});

export async function GET() {
  const organization = await ensureDefaultOrganization();
  const vendors = await prisma.vendor.findMany({
    where: { organizationId: organization.id },
    include: { materials: { include: { rateItem: true } } },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({
    vendors: vendors.flatMap((vendor) =>
      vendor.materials.map((material) => ({
        name: vendor.name,
        materialName: material.materialName,
        rateKey: material.rateItem?.key ?? ""
      }))
    )
  });
}

export async function POST(request: Request) {
  const body = saveVendorsSchema.parse(await request.json());
  const organization = await ensureDefaultOrganization();

  for (const link of body.vendors) {
    const vendor = await prisma.vendor.upsert({
      where: { id: vendorId(organization.id, link.name) },
      create: {
        id: vendorId(organization.id, link.name),
        organizationId: organization.id,
        name: link.name
      },
      update: {
        name: link.name
      }
    });

    const rate = await prisma.rateItem.findUnique({
      where: {
        organizationId_key: {
          organizationId: organization.id,
          key: link.rateKey
        }
      }
    });

    await prisma.vendorMaterial.upsert({
      where: { id: vendorMaterialId(vendor.id, link.materialName, link.rateKey) },
      create: {
        id: vendorMaterialId(vendor.id, link.materialName, link.rateKey),
        vendorId: vendor.id,
        rateItemId: rate?.id,
        materialName: link.materialName
      },
      update: {
        rateItemId: rate?.id,
        materialName: link.materialName
      }
    });
  }

  return NextResponse.json({ ok: true, count: body.vendors.length });
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
