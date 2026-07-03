import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDefaultOrganization } from "../../../../lib/default-org";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    key: string;
  };
};

const ratePatchSchema = z.object({
  label: z.string().optional(),
  rate: z.number().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  custom: z.boolean().optional()
});

export async function PATCH(request: Request, context: RouteContext) {
  const body = ratePatchSchema.parse(await request.json());
  const organization = await ensureDefaultOrganization();
  const key = decodeURIComponent(context.params.key);

  const current = await prisma.rateItem.findUnique({
    where: {
      organizationId_key: {
        organizationId: organization.id,
        key
      }
    }
  });

  if (!current) return NextResponse.json({ error: "Rate not found." }, { status: 404 });

  const rate = await prisma.rateItem.update({
    where: {
      organizationId_key: {
        organizationId: organization.id,
        key
      }
    },
    data: {
      label: body.label ?? current.label,
      rate: body.rate ?? Number(current.rate),
      unit: body.unit ?? current.unit,
      category: body.category ?? current.category,
      source: body.source ?? "user",
      custom: body.custom ?? true
    }
  });

  return NextResponse.json({
    rate: {
      key: rate.key,
      label: rate.label,
      rate: Number(rate.rate),
      unit: rate.unit,
      category: rate.category,
      source: rate.source,
      custom: rate.custom
    }
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const organization = await ensureDefaultOrganization();
  const key = decodeURIComponent(context.params.key);

  await prisma.rateItem.deleteMany({
    where: {
      organizationId: organization.id,
      key
    }
  });

  return NextResponse.json({ ok: true });
}
