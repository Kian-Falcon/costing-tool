import { AppShell } from "../../components/app-shell";
import { requireUser } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

type AiLogRow = {
  id: string;
  provider: string;
  modelId: string;
  promptVersion: string;
  requestHash: string;
  status: string;
  createdAt: Date;
  result: { error: string | null; usage: unknown; createdAt: Date } | null;
  cacheEntry: { id: string; createdAt: Date } | null;
};

export default async function AiLogsPage() {
  await requireUser();
  const logs = await loadAiLogs();

  return (
    <AppShell title="AI Logs" description="Review provider calls, prompt versions, status, cache hits, errors, and usage.">
      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Summary label="Requests" value={logs.length} />
          <Summary label="Succeeded" value={logs.filter((log) => log.status === "succeeded").length} />
          <Summary label="Cached" value={logs.filter((log) => log.cacheEntry).length} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-ink">Recent AI Requests</h2>
            <p className="text-sm text-slate-600">Last 50 server-side provider requests and cached outputs.</p>
          </div>
          {logs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Created</th>
                    <th className="px-5 py-3 font-medium">Provider</th>
                    <th className="px-5 py-3 font-medium">Model</th>
                    <th className="px-5 py-3 font-medium">Prompt</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Cache</th>
                    <th className="px-5 py-3 font-medium">Usage / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t border-slate-100 align-top">
                      <td className="px-5 py-3 text-slate-600">{log.createdAt.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3 font-medium text-ink">{log.provider}</td>
                      <td className="px-5 py-3 text-slate-600">{log.modelId}</td>
                      <td className="px-5 py-3 text-slate-600">
                        <div>{log.promptVersion}</div>
                        <div className="mt-1 max-w-[180px] truncate text-xs text-slate-400">{log.requestHash}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={log.status === "completed" ? "text-emerald-700" : log.status === "failed" ? "text-red-600" : "text-slate-600"}>{log.status}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{log.cacheEntry ? "cached" : "-"}</td>
                      <td className="px-5 py-3 text-slate-600">{log.result?.error ?? compactJson(log.result?.usage) ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-sm text-slate-500">No AI requests found yet.</div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

async function loadAiLogs(): Promise<AiLogRow[]> {
  try {
    return await prisma.aiRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        provider: true,
        modelId: true,
        promptVersion: true,
        requestHash: true,
        status: true,
        createdAt: true,
        result: { select: { error: true, usage: true, createdAt: true } },
        cacheEntry: { select: { id: true, createdAt: true } }
      }
    });
  } catch {
    return [];
  }
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-2xl font-semibold text-ink">{value.toLocaleString("en-IN")}</div>
      <div className="mt-1 text-sm text-slate-600">{label}</div>
    </div>
  );
}

function compactJson(value: unknown): string | undefined {
  if (!value) return undefined;
  return JSON.stringify(value).slice(0, 120);
}
