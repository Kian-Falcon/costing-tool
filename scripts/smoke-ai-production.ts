import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

type JsonObject = Record<string, unknown>;

const baseUrl = env("SMOKE_BASE_URL", "http://localhost:3000").replace(/\/$/, "");
const email = env("SMOKE_EMAIL", "admin@abc.com");
const password = env("SMOKE_PASSWORD", "password123");
const organizationName = env("SMOKE_ORG", "Kian Falcon");
const provider = env("SMOKE_PROVIDER", "openai");

let cookie = "";

async function main() {
  step(`Smoke target: ${baseUrl}`);
  await authenticate();
  await smokeAiCostItem();
  await smokeAiLogs();
  await maybeSmokePdf("BOQ PDF extraction", "/api/ai/extract-boq-pdf", "SMOKE_BOQ_PDF");
  await maybeSmokePdf("Spec Book PDF extraction", "/api/ai/extract-spec-pdf", "SMOKE_SPEC_PDF", { mode: "spec-book" });
  await maybeSmokePdf("PI PDF extraction", "/api/ai/extract-spec-pdf", "SMOKE_PI_PDF", { mode: "pi" });
  step("AI production smoke test completed.");
}

async function authenticate() {
  const login = await request("/api/auth/login", {
    method: "POST",
    json: { email, password }
  });

  if (login.response.ok) {
    captureCookie(login.response);
    pass(`Logged in as ${email}.`);
    return;
  }

  if (process.env.SMOKE_REGISTER !== "1") {
    throw new Error(`Login failed (${login.response.status}). Set SMOKE_REGISTER=1 only if this should create the account.`);
  }

  const register = await request("/api/auth/register", {
    method: "POST",
    json: { email, password, name: "Smoke Test", organizationName }
  });
  if (!register.response.ok) throw new Error(`Register failed (${register.response.status}): ${compact(register.body)}`);
  captureCookie(register.response);
  pass(`Registered and logged in as ${email}.`);
}

async function smokeAiCostItem() {
  const payload = {
    provider,
    item: {
      id: "smoke_ai_item",
      code: "SMK-001",
      name: "Executive workstation with pedestal",
      ptype: "TABLE",
      dims: "1500x750x750",
      qty: 1,
      margin: 35,
      spec: "25mm MDF top with laminate, MS powder coated frame, mobile pedestal"
    },
    rates: [],
    corpus: [],
    models: [],
    ratioNorms: []
  };

  const first = await request("/api/ai/cost-item", { method: "POST", json: payload });
  if (!first.response.ok) throw new Error(`AI cost item failed (${first.response.status}): ${compact(first.body)}`);
  const firstBody = first.body as JsonObject;
  if (!firstBody.result || !firstBody.aiRequestId) throw new Error(`AI cost item returned an unexpected body: ${compact(firstBody)}`);
  pass(`AI cost item succeeded with ${String(firstBody.provider)} / ${String(firstBody.modelId)}.`);

  const second = await request("/api/ai/cost-item", { method: "POST", json: payload });
  if (!second.response.ok) throw new Error(`AI cache repeat failed (${second.response.status}): ${compact(second.body)}`);
  pass("AI cost item repeat succeeded; cache should now be visible in logs.");
}

async function smokeAiLogs() {
  const logs = await request("/api/ai/logs?limit=20&promptVersion=cost-item-v1", { method: "GET" });
  if (!logs.response.ok) throw new Error(`AI logs failed (${logs.response.status}): ${compact(logs.body)}`);
  const body = logs.body as { summary?: { requests?: number; succeeded?: number; cached?: number }; logs?: Array<{ cache?: unknown }> };
  if (!body.summary?.requests) throw new Error("AI logs did not include the cost-item request.");
  if (!body.summary.succeeded) throw new Error("AI logs did not include a succeeded request.");
  if (!body.logs?.some((log) => log.cache)) throw new Error("AI logs did not include a cache entry.");
  pass(`AI logs verified: ${body.summary.requests} cost-item logs, ${body.summary.cached ?? 0} cached.`);
}

async function maybeSmokePdf(label: string, route: string, envName: string, fields: Record<string, string> = {}) {
  const filePath = process.env[envName];
  if (!filePath) {
    skip(`${label}: ${envName} not set.`);
    return;
  }
  if (!existsSync(filePath)) throw new Error(`${label}: file does not exist at ${filePath}`);

  const form = new FormData();
  const bytes = await readFile(filePath);
  form.append("file", new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), path.basename(filePath));
  for (const [key, value] of Object.entries(fields)) form.append(key, value);

  const result = await request(route, { method: "POST", body: form });
  if (!result.response.ok) throw new Error(`${label} failed (${result.response.status}): ${compact(result.body)}`);
  const body = result.body as { items?: unknown[]; sections?: unknown[]; status?: string; warning?: string };
  const count = body.items?.length ?? body.sections?.length ?? 0;
  pass(`${label} succeeded with ${count} extracted rows${body.warning ? " using fallback" : ""}.`);
}

async function request(route: string, options: { method: string; json?: unknown; body?: BodyInit }) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: options.method,
    headers: {
      ...(options.json ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {})
    },
    body: options.json ? JSON.stringify(options.json) : options.body
  });
  const text = await response.text();
  const body = text ? parseJson(text) : {};
  return { response, body };
}

function captureCookie(response: Response) {
  const value = response.headers.get("set-cookie");
  if (!value) return;
  cookie = value.split(";")[0];
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

function compact(value: unknown): string {
  return JSON.stringify(value).slice(0, 500);
}

function env(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function step(message: string) {
  console.log(`\n== ${message}`);
}

function pass(message: string) {
  console.log(`OK ${message}`);
}

function skip(message: string) {
  console.log(`SKIP ${message}`);
}

main().catch((error) => {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
