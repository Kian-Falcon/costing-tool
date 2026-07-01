import { buildInternalCostingCsv, type CostedBoqRow } from "@kf/importers";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  rows: z.array(z.custom<CostedBoqRow>())
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  return new NextResponse(buildInternalCostingCsv(body.rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=internal-costing.csv"
    }
  });
}
