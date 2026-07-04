import { NextResponse } from "next/server";
import { z } from "zod";
import { authJsonError, requireRole, requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { ensureEmbeddedVendorDirectory } from "../../../lib/rate-library-seed";

export const runtime = "nodejs";

const vendorLinkSchema = z.object({
  name: z.string().min(1),
  materialName: z.string().min(1),
  rateKey: z.string().min(1),
  lastRate: z.number().optional()
});

const saveVendorsSchema = z.object({
  vendors: z.array(vendorLinkSchema)
});

export async function GET() {
  try {
    const user = await requireUser();
    await ensureEmbeddedVendorDirectory(user);
    const vendors = await prisma.vendor.findMany({
      where: { organizationId: user.organizationId },
      include: { materials: { include: { rateItem: true } } },
      orderBy: { name: "asc" }
    });

    return NextResponse.json({
      vendors: vendors.flatMap((vendor) =>
        vendor.materials.map((material) => ({
          name: vendor.name,
          materialName: material.materialName,
          rateKey: material.rateItem?.key ?? "",
          lastRate: material.lastRate ? Number(material.lastRate) : undefined
        }))
      )
    });
  } catch (error) {
    return authJsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const body = saveVendorsSchema.parse(await request.json());

    for (const link of body.vendors) {
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

      const rate = await prisma.rateItem.findUnique({
        where: {
          organizationId_key: {
            organizationId: user.organizationId,
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
          materialName: link.materialName,
          lastRate: link.lastRate ?? rate?.rate
        },
        update: {
          rateItemId: rate?.id,
          materialName: link.materialName,
          lastRate: link.lastRate ?? rate?.rate
        }
      });
    }

    return NextResponse.json({ ok: true, count: body.vendors.length });
  } catch (error) {
    return authJsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name") ?? "";
    const materialName = searchParams.get("materialName") ?? "";
    const rateKey = searchParams.get("rateKey") ?? "";
    if (!name || !materialName || !rateKey) return NextResponse.json({ error: "name, materialName, and rateKey are required." }, { status: 400 });

    const vendorIdValue = vendorId(user.organizationId, name);
    await prisma.vendorMaterial.deleteMany({
      where: {
        id: vendorMaterialId(vendorIdValue, materialName, rateKey),
        vendor: { organizationId: user.organizationId }
      }
    });

    const remaining = await prisma.vendorMaterial.count({ where: { vendorId: vendorIdValue } });
    if (!remaining) await prisma.vendor.deleteMany({ where: { id: vendorIdValue, organizationId: user.organizationId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authJsonError(error);
  }
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
