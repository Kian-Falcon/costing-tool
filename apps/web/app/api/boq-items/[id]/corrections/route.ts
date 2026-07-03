import { type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { dbBoqItemId } from "../../../../../lib/default-org";
import { prisma } from "../../../../../lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

const correctionSchema = z.object({
  projectId: z.string().min(1),
  field: z.string().min(1),
  oldValue: z.unknown().optional(),
  newValue: z.unknown(),
  reason: z.string().optional()
});

export async function POST(request: Request, context: RouteContext) {
  const body = correctionSchema.parse(await request.json());
  const boqItemId = dbBoqItemId(body.projectId, decodeURIComponent(context.params.id));
  const item = await prisma.boqItem.findUnique({ where: { id: boqItemId } });

  if (!item) {
    return NextResponse.json({ error: "BOQ item has not been saved to the database yet." }, { status: 404 });
  }

  const correction = await prisma.boqItemCorrection.create({
    data: {
      boqItemId,
      field: body.field,
      oldValue: body.oldValue === undefined ? undefined : (body.oldValue as Prisma.InputJsonValue),
      newValue: body.newValue as Prisma.InputJsonValue,
      reason: body.reason
    }
  });

  return NextResponse.json({ correction });
}
