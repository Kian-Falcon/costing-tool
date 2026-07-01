"use client";

import type { BoqItem, CorpusProduct, CostResult, RateItem } from "@kf/shared";
import { Calculator, Database, Download, FileUp, Library, Loader2, Save, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

type CostedRow = {
  item: BoqItem;
  result: CostResult;
};

type ImportState = {
  corpus: CorpusProduct[];
  rates: RateItem[];
  vendors: number;
  trainingRows: number;
  rateRows: number;
};

export function CostingWorkspace() {
  const [imports, setImports] = useState<ImportState>({ corpus: [], rates: [], vendors: 0, trainingRows: 0, rateRows: 0 });
  const [items, setItems] = useState<BoqItem[]>([]);
  const [costed, setCosted] = useState<CostedRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("Load training and RM rates, then upload a BOQ.");

  const totals = useMemo(
    () => ({
      raw: sum(costed.map((row) => row.result.raw * row.item.qty)),
      factory: sum(costed.map((row) => row.result.factory * row.item.qty)),
      sell: sum(costed.map((row) => row.result.total))
    }),
    [costed]
  );

  async function importTraining(file: File) {
    setBusy("training");
    const result = await postFile<{ products: CorpusProduct[]; rowsRead: number; rowsImported: number }>("/api/imports/master-costing", file);
    setImports((current) => ({ ...current, corpus: result.products, trainingRows: result.rowsRead }));
    setMessage(`Imported ${result.rowsImported} corpus products from ${file.name}.`);
    setBusy(null);
  }

  async function importRates(file: File) {
    setBusy("rates");
    const result = await postFile<{ rates: RateItem[]; vendors: unknown[]; rowsRead: number; rowsImported: number }>("/api/imports/rm-rates", file);
    setImports((current) => ({ ...current, rates: result.rates, vendors: result.vendors.length, rateRows: result.rowsRead }));
    setMessage(`Imported ${result.rowsImported} rate keys and ${result.vendors.length} vendor/material links.`);
    setBusy(null);
  }

  async function uploadBoq(file: File) {
    setBusy("boq");
    const result = await postFile<{ items: BoqItem[] }>("/api/boqs/upload", file);
    setItems(result.items);
    setCosted([]);
    setMessage(`Loaded ${result.items.length} BOQ rows from ${file.name}.`);
    setBusy(null);
  }

  async function costAll() {
    setBusy("cost");
    const response = await fetch("/api/boqs/cost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items, rates: imports.rates, corpus: imports.corpus })
    });
    const result = (await response.json()) as { items: CostedRow[]; meta: { modelCount: number; ratioNormCount: number } };
    setCosted(result.items);
    setMessage(`Costed ${result.items.length} rows using ${result.meta.modelCount} models and ${result.meta.ratioNormCount} ratio norms.`);
    setBusy(null);
  }

  async function exportCsv(kind: "client-quotation" | "internal-costing") {
    setBusy(kind);
    const response = await fetch(`/api/exports/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows: costed })
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${kind}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setBusy(null);
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <aside className="space-y-4">
        <Panel title="Data Imports" icon={<Database size={18} />}>
          <UploadButton label="Master Costing" busy={busy === "training"} accept=".xlsx,.xls" onFile={importTraining} />
          <UploadButton label="RM Rates" busy={busy === "rates"} accept=".xlsx,.xls" onFile={importRates} />
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Corpus" value={imports.corpus.length} />
            <Stat label="Rates" value={imports.rates.length} />
            <Stat label="Vendors" value={imports.vendors} />
            <Stat label="Rows" value={imports.trainingRows + imports.rateRows} />
          </div>
        </Panel>

        <Panel title="BOQ Workflow" icon={<FileUp size={18} />}>
          <UploadButton label="Upload BOQ" busy={busy === "boq"} accept=".csv,.xlsx,.xls" onFile={uploadBoq} />
          <button
            type="button"
            disabled={!items.length || busy === "cost"}
            onClick={costAll}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy === "cost" ? <Loader2 className="animate-spin" size={16} /> : <Calculator size={16} />}
            Cost all rows
          </button>
          <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{message}</div>
        </Panel>

        <Panel title="Exports" icon={<Download size={18} />}>
          <div className="grid gap-2">
            <button disabled={!costed.length} onClick={() => exportCsv("client-quotation")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:text-slate-300">
              Client quotation CSV
            </button>
            <button disabled={!costed.length} onClick={() => exportCsv("internal-costing")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:text-slate-300">
              Internal costing CSV
            </button>
          </div>
        </Panel>
      </aside>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Raw x Qty" value={totals.raw} />
          <Metric label="Factory x Qty" value={totals.factory} />
          <Metric label="Quotation Total" value={totals.sell} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-ink">Costed BOQ</h2>
              <p className="text-sm text-slate-600">{costed.length ? `${costed.length} priced rows` : `${items.length} loaded rows waiting for costing`}</p>
            </div>
            <button title="Save" className="rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-100">
              <Save size={17} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Dims</th>
                  <th className="px-5 py-3 font-medium">Qty</th>
                  <th className="px-5 py-3 font-medium">Factory</th>
                  <th className="px-5 py-3 font-medium">Sell</th>
                  <th className="px-5 py-3 font-medium">Match</th>
                </tr>
              </thead>
              <tbody>
                {(costed.length ? costed : items.map((item) => ({ item, result: undefined }))).map((row) => (
                  <tr key={row.item.id} className="border-t border-slate-100 align-top">
                    <td className="px-5 py-3 text-slate-600">{row.item.code ?? ""}</td>
                    <td className="px-5 py-3 text-ink">
                      <div className="font-medium">{row.item.name}</div>
                      <div className="mt-1 max-w-xl text-xs text-slate-500">{row.item.spec}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{row.item.dims}</td>
                    <td className="px-5 py-3 text-slate-600">{row.item.qty}</td>
                    <td className="px-5 py-3 text-slate-700">{row.result ? format(row.result.factory) : "-"}</td>
                    <td className="px-5 py-3 font-medium text-ink">{row.result ? format(row.result.sell) : "-"}</td>
                    <td className="px-5 py-3 text-slate-600">{row.result ? row.result.matchLabel : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function UploadButton({ label, accept, busy, onFile }: { label: string; accept: string; busy: boolean; onFile: (file: File) => void }) {
  return (
    <label className="mt-2 flex cursor-pointer items-center justify-between rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
      <span className="flex items-center gap-2">{busy ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}{label}</span>
      <Library size={15} />
      <input className="sr-only" type="file" accept={accept} disabled={busy} onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])} />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <div className="font-semibold text-ink">{value.toLocaleString("en-IN")}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink">{format(value)}</div>
    </div>
  );
}

async function postFile<T>(url: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(url, { method: "POST", body });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as T;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function format(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}
