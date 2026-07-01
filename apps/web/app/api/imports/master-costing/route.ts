import { parseMasterCostingRows, parseMasterCostingWorkbook } from "@kf/importers";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  rows: z.array(z.record(z.unknown())),
  sourceFile: z.string().default("api")
});

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Expected a file field." }, { status: 400 });
    return NextResponse.json(parseMasterCostingWorkbook(Buffer.from(await file.arrayBuffer()), file.name));
  }

  const body = requestSchema.parse(await request.json());
  return NextResponse.json(parseMasterCostingRows(body.rows, body.sourceFile));
}
