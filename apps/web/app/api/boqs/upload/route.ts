import { parseBoqCsv, parseBoqWorkbook } from "@kf/importers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Expected a file field." }, { status: 400 });

  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    return NextResponse.json({ items: parseBoqCsv(await file.text()), sourceFile: file.name });
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return NextResponse.json({ items: parseBoqWorkbook(Buffer.from(await file.arrayBuffer())), sourceFile: file.name });
  }

  return NextResponse.json({ error: "Supported BOQ formats are CSV, XLSX, and XLS." }, { status: 415 });
}
