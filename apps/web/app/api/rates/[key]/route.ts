import { NextResponse } from "next/server";
import { z } from "zod";
import { authJsonError, requireRole, requireUser } from "../../../../lib/auth";
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
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const body = ratePatchSchema.parse(await request.json());
    const key = decodeURIComponent(context.params.key);

    const current = await prisma.rateItem.findUnique({
      where: {
        organizationId_key: {
          organizationId: user.organizationId,
          key
        }
      }
    });

    if (!current) return NextResponse.json({ error: "Rate not found." }, { status: 404 });

    const rate = await prisma.rateItem.update({
      where: {
        organizationId_key: {
          organizationId: user.organizationId,
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
  } catch (error) {
    return authJsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const key = decodeURIComponent(context.params.key);

    await prisma.rateItem.deleteMany({
      where: {
        organizationId: user.organizationId,
        key
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authJsonError(error);
  }
}
