import { parseRmRateRows, parseRmRatesWorkbook } from "@kf/importers";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const jsonSchema = z.object({
  rows: z.array(z.record(z.unknown())),
  sourceFile: z.string().default("api")
});

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Expected a file field." }, { status: 400 });
    return NextResponse.json(parseRmRatesWorkbook(Buffer.from(await file.arrayBuffer()), file.name));
  }

  const body = jsonSchema.parse(await request.json());
  return NextResponse.json(parseRmRateRows(body.rows, body.sourceFile));
}
