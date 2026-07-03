import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import type { CurrentUser } from "./auth";

export type StoredFileInput = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  purpose: "boq" | "training" | "rates" | "pdf" | "export" | "generic";
  user?: CurrentUser;
};

export async function storeUploadedFile(input: StoredFileInput) {
  const checksum = sha256(input.buffer);
  const provider = storageProvider();
  const storageKey = storageKeyFor(input.purpose, checksum, input.filename);
  const bucket = process.env.STORAGE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || "costing-tool";

  if (provider === "supabase") {
    await writeSupabaseStorage(bucket, storageKey, input.buffer, input.mimeType);
  } else {
    await writeLocalStorage(storageKey, input.buffer);
  }

  return prisma.uploadedFile.create({
    data: {
      organizationId: input.user?.organizationId,
      uploadedById: input.user?.id,
      filename: input.filename,
      mimeType: input.mimeType || "application/octet-stream",
      sizeBytes: input.buffer.byteLength,
      provider,
      bucket,
      storageKey,
      checksum
    }
  });
}

export async function writeExportFile(input: Omit<StoredFileInput, "purpose"> & { user?: CurrentUser }) {
  return storeUploadedFile({ ...input, purpose: "export" });
}

function storageProvider(): "local" | "supabase" {
  return process.env.STORAGE_DRIVER === "supabase" ? "supabase" : "local";
}

function storageKeyFor(purpose: string, checksum: string, filename: string): string {
  return `${purpose}/${new Date().toISOString().slice(0, 10)}/${checksum.slice(0, 16)}-${slug(filename)}`;
}

async function writeLocalStorage(storageKey: string, buffer: Buffer) {
  const root = process.env.LOCAL_STORAGE_DIR || ".storage";
  const target = path.join(process.cwd(), root, storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
}

async function writeSupabaseStorage(bucket: string, storageKey: string, buffer: Buffer, contentType: string) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase storage.");

  const response = await fetch(`${url.replace(/\/$/, "")}/storage/v1/object/${bucket}/${storageKey}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "content-type": contentType || "application/octet-stream",
      "x-upsert": "true"
    },
    body: new Uint8Array(buffer)
  });

  if (!response.ok) throw new Error(`Supabase storage upload failed: ${await response.text()}`);
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "").slice(0, 120) || "file";
}
