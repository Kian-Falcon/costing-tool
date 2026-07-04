import { NextResponse } from "next/server";
import { z } from "zod";
import { authJsonError, requireRole, requireUser } from "../../../lib/auth";
import { EMBEDDED_RATE_LIBRARY_META } from "../../../lib/embedded-rate-library";
import { prisma } from "../../../lib/prisma";
import { ensureEmbeddedRateLibrary } from "../../../lib/rate-library-seed";

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
  try {
    const user = await requireUser();
    const seed = await ensureEmbeddedRateLibrary(user);
    const rates = await prisma.rateItem.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ category: "asc" }, { label: "asc" }]
    });

    return NextResponse.json({
      meta: {
        ...EMBEDDED_RATE_LIBRARY_META,
        seededCreated: seed.created,
        totalEmbedded: seed.totalEmbedded
      },
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
  } catch (error) {
    return authJsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    requireRole(user, "MEMBER");
    const body = saveRatesSchema.parse(await request.json());

    for (const rate of body.rates) {
      await prisma.rateItem.upsert({
        where: {
          organizationId_key: {
            organizationId: user.organizationId,
            key: rate.key
          }
        },
        create: {
        organizationId: user.organizationId,
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
  } catch (error) {
    return authJsonError(error);
  }
}
