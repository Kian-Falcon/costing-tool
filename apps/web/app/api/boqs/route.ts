import { parseBoqRows } from "@kf/importers";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  rows: z.array(z.record(z.unknown()))
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  return NextResponse.json({ items: parseBoqRows(body.rows) });
}
