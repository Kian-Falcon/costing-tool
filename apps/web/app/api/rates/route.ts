import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDefaultOrganization } from "../../../lib/default-org";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

const rateSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  rate: z.number(),
  unit: z.string().min(1),
  category: z.string().min(1),
  source: z.string().default("user"),
  custom: z.boolean().optional()
});

const saveRatesSchema = z.object({
  rates: z.array(rateSchema)
});

export async function GET() {
  const organization = await ensureDefaultOrganization();
  const rates = await prisma.rateItem.findMany({
    where: { organizationId: organization.id },
    orderBy: [{ category: "asc" }, { label: "asc" }]
  });

  return NextResponse.json({
    rates: rates.map((rate) => ({
      key: rate.key,
      label: rate.label,
      rate: Number(rate.rate),
      unit: rate.unit,
      category: rate.category,
      source: rate.source,
      custom: rate.custom
    }))
  });
}

export async function POST(request: Request) {
  const body = saveRatesSchema.parse(await request.json());
  const organization = await ensureDefaultOrganization();

  for (const rate of body.rates) {
    await prisma.rateItem.upsert({
      where: {
        organizationId_key: {
          organizationId: organization.id,
          key: rate.key
        }
      },
      create: {
        organizationId: organization.id,
        key: rate.key,
        label: rate.label,
        rate: rate.rate,
        unit: rate.unit,
        category: rate.category,
        source: rate.source,
        custom: rate.custom ?? rate.source === "user"
      },
      update: {
        label: rate.label,
        rate: rate.rate,
        unit: rate.unit,
        category: rate.category,
        source: rate.source,
        custom: rate.custom ?? rate.source === "user"
      }
    });
  }

  return NextResponse.json({ ok: true, count: body.rates.length });
}
