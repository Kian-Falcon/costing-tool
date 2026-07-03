"use client";

import { rebuildModelsFromCorpus, rebuildRatioNorms } from "@kf/costing-engine";
import type { BoqItem, CorpusProduct, CostResult, RateItem, RatioNorm, TrainedModel } from "@kf/shared";
import { Calculator, Database, Download, FileUp, Library, Loader2, Save, Trash2, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type CostedRow = {
  item: BoqItem;
  result: CostResult;
};

type VendorLink = {
  name: string;
  materialName: string;
  rateKey: string;
};

type ImportState = {
  corpus: CorpusProduct[];
  rates: RateItem[];
  vendors: VendorLink[];
  trainingRows: number;
  rateRows: number;
};

type WorkspaceSnapshot = {
  version: 2;
  id: string;
  projectName: string;
  clientName: string;
  savedAt: string;
  imports: ImportState;
  items: BoqItem[];
  costed: CostedRow[];
  message: string;
};

type ProjectArchive = {
  id: string;
  name: string;
  clientName: string;
  savedAt: string;
  itemCount: number;
  total: number;
  snapshot: WorkspaceSnapshot;
};

type ExportFormat = "csv" | "xlsx" | "pdf";

type ExportJob = {
  id: string;
  kind: string;
  status: string;
  input: { format?: ExportFormat; rowCount?: number } | Record<string, unknown>;
  outputKey: string | null;
  createdAt: string;
  updatedAt: string;
};

type ActiveView = "workspace" | "projects" | "rates" | "vendors" | "training" | "models" | "editor";

const SNAPSHOT_KEY = "kf-costing-workspace-v2";
const ARCHIVE_KEY = "kf-costing-project-archive-v1";
const EMPTY_IMPORTS: ImportState = { corpus: [], rates: [], vendors: [], trainingRows: 0, rateRows: 0 };

export function CostingWorkspace() {
  const [projectName, setProjectName] = useState("Untitled BOQ");
  const [clientName, setClientName] = useState("");
  const [imports, setImports] = useState<ImportState>(EMPTY_IMPORTS);
  const [items, setItems] = useState<BoqItem[]>([]);
  const [costed, setCosted] = useState<CostedRow[]>([]);
  const [projects, setProjects] = useState<ProjectArchive[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("workspace");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [rateSearch, setRateSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("Load training and RM rates, then upload a BOQ.");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const hydrated = useRef(false);

  const totals = useMemo(
    () => ({
      raw: sum(costed.map((row) => row.result.raw * row.item.qty)),
      factory: sum(costed.map((row) => row.result.factory * row.item.qty)),
      sell: sum(costed.map((row) => row.result.total))
    }),
    [costed]
  );

  const models = useMemo(() => rebuildModelsFromCorpus(imports.corpus), [imports.corpus]);
  const ratioNorms = useMemo(() => rebuildRatioNorms(imports.corpus), [imports.corpus]);
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0];

  useEffect(() => {
    const saved = window.localStorage.getItem(SNAPSHOT_KEY) ?? window.localStorage.getItem("kf-costing-workspace-v1");
    const archive = window.localStorage.getItem(ARCHIVE_KEY);
    hydrated.current = true;

    if (archive) {
      try {
        setProjects(JSON.parse(archive) as ProjectArchive[]);
      } catch {
        window.localStorage.removeItem(ARCHIVE_KEY);
      }
    }

    void refreshProjects();
    void refreshLibraries();
    void refreshExportJobs();

    if (!saved) return;
    try {
      restoreSnapshot(normalizeSnapshot(JSON.parse(saved)));
    } catch {
      window.localStorage.removeItem(SNAPSHOT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const snapshot = buildSnapshot({ projectName, clientName, imports, items, costed, message });
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
        setLastSaved(snapshot.savedAt);
      } catch {
        setMessage("Autosave storage is full. Export a project snapshot before continuing.");
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [projectName, clientName, imports, items, costed, message]);

  useEffect(() => {
    if (!hydrated.current) return;
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(projects));
  }, [projects]);

  async function importTraining(file: File) {
    setBusy("training");
    const result = await postFile<{ sourceFile: string; products: CorpusProduct[]; rowsRead: number; rowsImported: number }>("/api/imports/master-costing", file);
    setImports((current) => ({ ...current, corpus: result.products, trainingRows: result.rowsRead }));
    setMessage(`Imported ${result.rowsImported} corpus products from ${file.name}.`);
    void saveTrainingSource(result.sourceFile, result.rowsRead, result.products);
    setBusy(null);
  }

  async function importRates(file: File) {
    setBusy("rates");
    const result = await postFile<{ rates: RateItem[]; vendors: VendorLink[]; rowsRead: number; rowsImported: number }>("/api/imports/rm-rates", file);
    setImports((current) => ({ ...current, rates: result.rates, vendors: result.vendors, rateRows: result.rowsRead }));
    setMessage(`Imported ${result.rowsImported} rate keys and ${result.vendors.length} vendor/material links.`);
    void saveRates(result.rates);
    void saveVendors(result.vendors);
    setBusy(null);
  }

  async function uploadBoq(file: File) {
    setBusy("boq");
    const result = await postFile<{ items: BoqItem[] }>("/api/boqs/upload", file);
    setItems(result.items);
    setSelectedItemId(result.items[0]?.id ?? null);
    setCosted([]);
    setProjectName(file.name.replace(/\.[^.]+$/, ""));
    setMessage(`Loaded ${result.items.length} BOQ rows from ${file.name}.`);
    setBusy(null);
  }

  async function uploadBoqPdf(file: File) {
    setBusy("pdf");
    try {
      const result = await postFile<{ items?: BoqItem[]; fallbackItems?: BoqItem[]; warning?: string; error?: string }>("/api/ai/extract-boq-pdf", file);
      const extracted = result.items ?? result.fallbackItems ?? [];
      setItems(extracted);
      setSelectedItemId(extracted[0]?.id ?? null);
      setCosted([]);
      setProjectName(file.name.replace(/\.[^.]+$/, ""));
      setMessage(result.warning ?? `Extracted ${extracted.length} BOQ rows from ${file.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not extract BOQ PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function costAll() {
    setBusy("cost");
    const result = await costItems(items);
    setCosted(result.items);
    setMessage(`Costed ${result.items.length} rows using ${result.meta.modelCount} models and ${result.meta.ratioNormCount} ratio norms.`);
    setBusy(null);
  }

  async function recostItem(item: BoqItem) {
    setBusy(`cost:${item.id}`);
    const result = await costItems([item]);
    setCosted((current) => [...current.filter((row) => row.item.id !== item.id), result.items[0]]);
    setMessage(`Recosted ${item.name}.`);
    setBusy(null);
  }

  async function aiCostItem(item: BoqItem, provider: "openai" | "anthropic") {
    setBusy(`ai:${provider}:${item.id}`);
    try {
      const response = await fetch("/api/ai/cost-item", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ item, rates: imports.rates, corpus: imports.corpus, models, ratioNorms, provider })
      });
      const body = (await response.json()) as { result?: CostResult; error?: string; seedResult?: CostResult };
      if (!response.ok || !body.result) throw new Error(body.error ?? "AI costing failed.");
      setCosted((current) => [...current.filter((row) => row.item.id !== item.id), { item, result: body.result! }]);
      setMessage(`AI costed ${item.name} with ${provider}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI costing failed.");
    } finally {
      setBusy(null);
    }
  }

  async function costItems(inputItems: BoqItem[]) {
    const response = await fetch("/api/boqs/cost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: inputItems, rates: imports.rates, corpus: imports.corpus, models, ratioNorms })
    });
    return (await response.json()) as { items: CostedRow[]; meta: { modelCount: number; ratioNormCount: number } };
  }

  function updateItem(itemId: string, patch: Partial<BoqItem>) {
    const previous = items.find((item) => item.id === itemId);
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
    setCosted((current) => current.filter((row) => row.item.id !== itemId));
    if (previous) void logCorrections(previous, patch);
    setMessage("Row updated. Re-cost the row or run cost all.");
  }

  function updateRate(key: string, patch: Partial<RateItem>) {
    const existing = imports.rates.find((rate) => rate.key === key);
    const updated = existing ? { ...existing, ...patch, custom: true, source: "user" } : undefined;
    setImports((current) => ({
      ...current,
      rates: current.rates.map((rate) => (rate.key === key ? { ...rate, ...patch, custom: true, source: "user" } : rate))
    }));
    if (updated) void patchRate(key, updated);
  }

  function addCustomRate() {
    const key = `custom_${Date.now()}`;
    const rate = { key, label: "Custom material", rate: 0, unit: "NOS", category: "Custom", source: "user", custom: true };
    setImports((current) => ({
      ...current,
      rates: [...current.rates, rate]
    }));
    void saveRates([rate]);
  }

  function removeRate(key: string) {
    setImports((current) => ({ ...current, rates: current.rates.filter((rate) => rate.key !== key) }));
    void deleteRate(key);
  }

  async function refreshProjects() {
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) return;
      const body = (await response.json()) as { projects: ProjectArchive[] };
      setProjects(body.projects.map((project) => ({ ...project, snapshot: normalizeSnapshot(project.snapshot) })));
    } catch {
      // Browser archive remains available if the database is offline.
    }
  }

  async function refreshLibraries() {
    try {
      const [ratesResponse, vendorsResponse] = await Promise.all([fetch("/api/rates"), fetch("/api/vendors")]);
      const ratesBody = ratesResponse.ok ? ((await ratesResponse.json()) as { rates: RateItem[] }) : { rates: [] };
      const vendorsBody = vendorsResponse.ok ? ((await vendorsResponse.json()) as { vendors: VendorLink[] }) : { vendors: [] };
      setImports((current) => ({
        ...current,
        rates: current.rates.length ? current.rates : ratesBody.rates,
        vendors: current.vendors.length ? current.vendors : vendorsBody.vendors
      }));
    } catch {
      // Local snapshot data remains available if the database is offline.
    }
  }

  async function saveProject() {
    const snapshot = buildSnapshot({ projectName, clientName, imports, items, costed, message });
    const archive: ProjectArchive = {
      id: snapshot.id,
      name: projectName,
      clientName,
      savedAt: snapshot.savedAt,
      itemCount: items.length,
      total: totals.sell,
      snapshot
    };
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    setLastSaved(snapshot.savedAt);
    setProjects((current) => [archive, ...current.filter((project) => project.id !== archive.id)].slice(0, 25));

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot, itemCount: items.length, total: totals.sell })
      });
      if (!response.ok) throw new Error(await response.text());
      const body = (await response.json()) as { project: ProjectArchive };
      const savedProject = { ...body.project, snapshot: normalizeSnapshot(body.project.snapshot) };
      setProjects((current) => [savedProject, ...current.filter((project) => project.id !== savedProject.id)].slice(0, 25));
      setMessage(`Saved ${projectName} to Supabase project archive.`);
    } catch {
      setMessage(`Saved ${projectName} locally. Database save is unavailable.`);
    }
  }

  async function loadProject(project: ProjectArchive) {
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}`);
      if (!response.ok) throw new Error(await response.text());
      const body = (await response.json()) as { project: ProjectArchive };
      restoreSnapshot(normalizeSnapshot(body.project.snapshot));
      setActiveView("workspace");
      setMessage(`Loaded ${body.project.name} from Supabase.`);
    } catch {
      restoreSnapshot(normalizeSnapshot(project.snapshot));
      setActiveView("workspace");
      setMessage(`Loaded archived project ${project.name} from local cache.`);
    }
  }

  async function deleteProject(id: string) {
    setProjects((current) => current.filter((project) => project.id !== id));
    try {
      await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
      setMessage("Project deleted from archive.");
    } catch {
      setMessage("Project removed locally. Database delete is unavailable.");
    }
  }

  async function saveRates(rates: RateItem[]) {
    try {
      await fetch("/api/rates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rates })
      });
    } catch {
      // Snapshot persistence remains the fallback.
    }
  }

  async function patchRate(key: string, rate: RateItem) {
    try {
      await fetch(`/api/rates/${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rate)
      });
    } catch {
      // Snapshot persistence remains the fallback.
    }
  }

  async function deleteRate(key: string) {
    try {
      await fetch(`/api/rates/${encodeURIComponent(key)}`, { method: "DELETE" });
    } catch {
      // Snapshot persistence remains the fallback.
    }
  }

  async function saveVendors(vendors: VendorLink[]) {
    try {
      await fetch("/api/vendors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vendors })
      });
    } catch {
      // Snapshot persistence remains the fallback.
    }
  }

  async function saveTrainingSource(sourceFile: string, rowsRead: number, products: CorpusProduct[]) {
    try {
      await fetch("/api/training-sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceFile, rowsRead, products })
      });
    } catch {
      // Snapshot persistence remains the fallback.
    }
  }

  async function logCorrections(previous: BoqItem, patch: Partial<BoqItem>) {
    const projectId = stableProjectId(projectName, clientName);
    await Promise.all(
      Object.entries(patch).map(([field, newValue]) =>
        fetch(`/api/boq-items/${encodeURIComponent(previous.id)}/corrections`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            projectId,
            field,
            oldValue: previous[field as keyof BoqItem] ?? null,
            newValue: newValue ?? null,
            reason: patch.reason || previous.reason
          })
        }).catch(() => undefined)
      )
    );
  }

  function exportSnapshot() {
    const snapshot = buildSnapshot({ projectName, clientName, imports, items, costed, message });
    downloadBlob(JSON.stringify(snapshot, null, 2), `${slug(projectName)}-snapshot.json`, "application/json");
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    setLastSaved(snapshot.savedAt);
    setMessage("Project snapshot exported.");
  }

  function exportAllProjects() {
    downloadBlob(JSON.stringify(projects, null, 2), "kian-falcon-project-archive.json", "application/json");
  }

  async function importSnapshot(file: File) {
    setBusy("snapshot");
    try {
      const snapshot = normalizeSnapshot(JSON.parse(await file.text()));
      restoreSnapshot(snapshot);
      window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
      setMessage(`Loaded snapshot saved ${new Date(snapshot.savedAt).toLocaleString("en-IN")}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load project snapshot.");
    } finally {
      setBusy(null);
    }
  }

  function clearSavedWorkspace() {
    window.localStorage.removeItem(SNAPSHOT_KEY);
    setProjectName("Untitled BOQ");
    setClientName("");
    setImports(EMPTY_IMPORTS);
    setItems([]);
    setCosted([]);
    setSelectedItemId(null);
    setLastSaved(null);
    setMessage("Saved workspace cleared.");
  }

  async function exportFile(kind: "client-quotation" | "internal-costing" | "pi", format: ExportFormat) {
    setBusy(`${kind}-${format}`);
    const response = await fetch(`/api/exports/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows: costed, format })
    });
    if (!response.ok) {
      setBusy(null);
      setMessage("Export failed. Check the export history and server logs.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${kind === "pi" ? "proforma-invoice" : kind}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
    await refreshExportJobs();
    setMessage(`Exported ${kindLabel(kind)} ${format.toUpperCase()}.`);
    setBusy(null);
  }

  async function refreshExportJobs() {
    try {
      const response = await fetch("/api/exports/jobs", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { jobs: ExportJob[] };
      setExportJobs(payload.jobs);
    } catch {
      // Export history is nice to have; downloads should not depend on it.
    }
  }

  function restoreSnapshot(snapshot: WorkspaceSnapshot) {
    setProjectName(snapshot.projectName);
    setClientName(snapshot.clientName);
    setImports(snapshot.imports);
    setItems(snapshot.items);
    setCosted(snapshot.costed);
    setSelectedItemId(snapshot.items[0]?.id ?? null);
    setMessage(snapshot.message || "Restored saved workspace.");
    setLastSaved(snapshot.savedAt);
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <aside className="space-y-4">
        <Panel title="Project" icon={<Save size={18} />}>
          <div className="grid gap-2">
            <TextInput label="Project" value={projectName} onChange={setProjectName} />
            <TextInput label="Client" value={clientName} onChange={setClientName} />
            <button onClick={saveProject} className="rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white">
              Save to archive
            </button>
          </div>
          <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-500">
            {lastSaved ? `Autosaved ${new Date(lastSaved).toLocaleString("en-IN")}` : "Autosave ready"}
          </div>
        </Panel>

        <Panel title="Data Imports" icon={<Database size={18} />}>
          <UploadButton label="Master Costing" busy={busy === "training"} accept=".xlsx,.xls" onFile={importTraining} />
          <UploadButton label="RM Rates" busy={busy === "rates"} accept=".xlsx,.xls" onFile={importRates} />
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Corpus" value={imports.corpus.length} />
            <Stat label="Rates" value={imports.rates.length} />
            <Stat label="Vendors" value={imports.vendors.length} />
            <Stat label="Rows" value={imports.trainingRows + imports.rateRows} />
          </div>
        </Panel>

        <Panel title="BOQ Workflow" icon={<FileUp size={18} />}>
          <UploadButton label="Upload BOQ" busy={busy === "boq"} accept=".csv,.xlsx,.xls" onFile={uploadBoq} />
          <UploadButton label="Extract BOQ PDF" busy={busy === "pdf"} accept=".pdf" onFile={uploadBoqPdf} />
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
          <div className="grid gap-3">
            <ExportButtonRow title="Client quotation" disabled={!costed.length} busy={busy} kind="client-quotation" formats={["csv", "xlsx", "pdf"]} onExport={exportFile} />
            <ExportButtonRow title="Internal costing" disabled={!costed.length} busy={busy} kind="internal-costing" formats={["csv", "xlsx", "pdf"]} onExport={exportFile} />
            <ExportButtonRow title="PI" disabled={!costed.length} busy={busy} kind="pi" formats={["xlsx", "pdf"]} onExport={exportFile} />
            <ExportHistory jobs={exportJobs} />
            <button onClick={exportSnapshot} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Save snapshot
            </button>
            <UploadButton label="Load snapshot" busy={busy === "snapshot"} accept=".json" onFile={importSnapshot} />
            <button onClick={clearSavedWorkspace} className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Trash2 size={15} />
              Clear saved workspace
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

        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <div className="flex flex-wrap gap-1">
            {[
              ["workspace", "Workspace"],
              ["projects", "Projects"],
              ["rates", "Rates"],
              ["vendors", "Vendors"],
              ["training", "Training"],
              ["models", "Models"],
              ["editor", "Row Editor"]
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveView(key as ActiveView)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${activeView === key ? "bg-moss text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeView === "workspace" && (
          <WorkspaceTable
            items={items}
            costed={costed}
            selectedItemId={selectedItem?.id}
            onSelect={(itemId) => {
              setSelectedItemId(itemId);
              setActiveView("editor");
            }}
            onSave={exportSnapshot}
          />
        )}

        {activeView === "projects" && <ProjectArchiveView projects={projects} onLoad={loadProject} onDelete={deleteProject} onExportAll={exportAllProjects} />}

        {activeView === "rates" && <RateLibrary rates={imports.rates} search={rateSearch} onSearch={setRateSearch} onUpdate={updateRate} onAdd={addCustomRate} onRemove={removeRate} />}

        {activeView === "vendors" && <VendorDirectory vendors={imports.vendors} search={vendorSearch} onSearch={setVendorSearch} />}

        {activeView === "training" && <TrainingDataView imports={imports} />}

        {activeView === "models" && <ModelView models={models} ratioNorms={ratioNorms} />}

        {activeView === "editor" && (
          <RowEditor
            item={selectedItem}
            costed={costed.find((row) => row.item.id === selectedItem?.id)}
            busy={selectedItem ? busy === `cost:${selectedItem.id}` : false}
            aiBusy={selectedItem ? busy === `ai:openai:${selectedItem.id}` || busy === `ai:anthropic:${selectedItem.id}` : false}
            onUpdate={updateItem}
            onRecost={recostItem}
            onAiCost={aiCostItem}
          />
        )}
      </div>
    </section>
  );
}

function WorkspaceTable({
  items,
  costed,
  selectedItemId,
  onSelect,
  onSave
}: {
  items: BoqItem[];
  costed: CostedRow[];
  selectedItemId?: string;
  onSelect: (itemId: string) => void;
  onSave: () => void;
}) {
  const rows = costed.length ? costed : items.map((item) => ({ item, result: undefined }));
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="font-semibold text-ink">Costed BOQ</h2>
          <p className="text-sm text-slate-600">{costed.length ? `${costed.length} priced rows` : `${items.length} loaded rows waiting for costing`}</p>
        </div>
        <button title="Save snapshot" onClick={onSave} className="rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-100">
          <Save size={17} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-3 font-medium">Code</th>
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Dims</th>
              <th className="px-5 py-3 font-medium">Qty</th>
              <th className="px-5 py-3 font-medium">Factory</th>
              <th className="px-5 py-3 font-medium">Sell</th>
              <th className="px-5 py-3 font-medium">Match</th>
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.item.id} className={`border-t border-slate-100 align-top ${row.item.id === selectedItemId ? "bg-[#f2f6f4]" : ""}`}>
                <td className="px-5 py-3 text-slate-600">{row.item.code ?? ""}</td>
                <td className="px-5 py-3 text-ink">
                  <div className="font-medium">{row.item.name}</div>
                  <div className="mt-1 max-w-xl text-xs text-slate-500">{row.item.spec}</div>
                  {row.result && row.result.confidence < 0.55 ? <div className="mt-1 text-xs font-medium text-copper">Low confidence</div> : null}
                </td>
                <td className="px-5 py-3 text-slate-600">{row.item.dims}</td>
                <td className="px-5 py-3 text-slate-600">{row.item.qty}</td>
                <td className="px-5 py-3 text-slate-700">{row.result ? format(row.result.factory) : "-"}</td>
                <td className="px-5 py-3 font-medium text-ink">{row.result ? format(row.result.sell) : "-"}</td>
                <td className="px-5 py-3 text-slate-600">{row.result ? row.result.matchLabel : "-"}</td>
                <td className="px-5 py-3">
                  <button onClick={() => onSelect(row.item.id)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowEditor({
  item,
  costed,
  busy,
  aiBusy,
  onUpdate,
  onRecost,
  onAiCost
}: {
  item?: BoqItem;
  costed?: CostedRow;
  busy: boolean;
  aiBusy: boolean;
  onUpdate: (itemId: string, patch: Partial<BoqItem>) => void;
  onRecost: (item: BoqItem) => void;
  onAiCost: (item: BoqItem, provider: "openai" | "anthropic") => void;
}) {
  if (!item) return <EmptyState title="No BOQ row selected" text="Upload a BOQ, then select a row to edit costing inputs." />;
  const update = (patch: Partial<BoqItem>) => onUpdate(item.id, patch);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Panel title="Row Inputs" icon={<Calculator size={18} />}>
        <div className="grid gap-3 md:grid-cols-2">
          <TextInput label="Product" value={item.name} onChange={(value) => update({ name: value })} />
          <TextInput label="Code" value={item.code ?? ""} onChange={(value) => update({ code: value })} />
          <TextInput label="Dimensions" value={item.dims} onChange={(value) => update({ dims: value })} />
          <NumberInput label="Qty" value={item.qty} onChange={(value) => update({ qty: value })} />
          <TextInput label="Construction" value={item.ct ?? ""} onChange={(value) => update({ ct: value })} />
          <NumberInput label="Margin %" value={item.margin} onChange={(value) => update({ margin: value })} />
          <NumberInput label="Raw override" value={item.rawOverride ?? 0} onChange={(value) => update({ rawOverride: value || undefined })} />
          <NumberInput label="Manual factory" value={item.manualFac ?? 0} onChange={(value) => update({ manualFac: value || undefined })} />
          <NumberInput label="Fabric rate" value={item.fabricRate ?? 0} onChange={(value) => update({ fabricRate: value || undefined })} />
          <NumberInput label="Fabric mtr" value={item.fabricMtr ?? 0} onChange={(value) => update({ fabricMtr: value || undefined })} />
        </div>
        <div className="mt-3 grid gap-3">
          <TextArea label="Specification" value={item.spec ?? ""} onChange={(value) => update({ spec: value })} />
          <TextArea label="Notes" value={item.notes ?? ""} onChange={(value) => update({ notes: value })} />
          <TextArea label="Reason" value={item.reason ?? ""} onChange={(value) => update({ reason: value })} />
        </div>
        <button
          disabled={busy}
          onClick={() => onRecost(item)}
          className="mt-4 flex items-center justify-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Calculator size={16} />}
          Re-cost row
        </button>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button disabled={aiBusy} onClick={() => onAiCost(item, "openai")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:text-slate-300">
            OpenAI cost
          </button>
          <button disabled={aiBusy} onClick={() => onAiCost(item, "anthropic")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:text-slate-300">
            Claude cost
          </button>
        </div>
      </Panel>

      <Panel title="Material Breakdown" icon={<Library size={18} />}>
        {costed ? (
          <div className="space-y-2">
            <Metric label="Factory" value={costed.result.factory} />
            <Metric label="Sell" value={costed.result.sell} />
            <div className="max-h-[460px] overflow-auto rounded-md border border-slate-200">
              {costed.result.breakdown.map((line) => (
                <div key={`${line.materialKey}:${line.label}`} className="border-t border-slate-100 p-3 first:border-t-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-ink">{line.label}</div>
                      <div className="text-xs text-slate-500">{line.qty.toFixed(3)} {line.unit} x {format(line.rate)}</div>
                    </div>
                    <div className="text-sm font-semibold text-ink">{format(line.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="No current costing" text="Re-cost this row to inspect its material breakdown." />
        )}
      </Panel>
    </div>
  );
}

function ProjectArchiveView({
  projects,
  onLoad,
  onDelete,
  onExportAll
}: {
  projects: ProjectArchive[];
  onLoad: (project: ProjectArchive) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onExportAll: () => void;
}) {
  return (
    <Panel title="Project Archive" icon={<Save size={18} />}>
      <div className="mb-3 flex justify-end">
        <button disabled={!projects.length} onClick={onExportAll} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:text-slate-300">
          Export all projects
        </button>
      </div>
      <div className="grid gap-2">
        {projects.length ? projects.map((project) => (
          <div key={project.id} className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">{project.name}</div>
                <div className="text-sm text-slate-500">{project.clientName || "No client"} | {project.itemCount} rows | {format(project.total)}</div>
                <div className="text-xs text-slate-500">{new Date(project.savedAt).toLocaleString("en-IN")}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onLoad(project)} className="rounded-md bg-moss px-3 py-1.5 text-xs font-semibold text-white">Load</button>
                <button onClick={() => onDelete(project.id)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">Delete</button>
              </div>
            </div>
          </div>
        )) : <EmptyState title="No saved projects" text="Save the current BOQ to add it to the archive." />}
      </div>
    </Panel>
  );
}

function RateLibrary({
  rates,
  search,
  onSearch,
  onUpdate,
  onAdd,
  onRemove
}: {
  rates: RateItem[];
  search: string;
  onSearch: (value: string) => void;
  onUpdate: (key: string, patch: Partial<RateItem>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  const filtered = rates.filter((rate) => `${rate.key} ${rate.label} ${rate.category}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <Panel title="Rate Library" icon={<Library size={18} />}>
      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto]">
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search rates" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={onAdd} className="rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white">Add rate</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Key</th>
              <th className="px-3 py-2 font-medium">Label</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Unit</th>
              <th className="px-3 py-2 font-medium">Rate</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((rate) => (
              <tr key={rate.key} className="border-t border-slate-100">
                <td className="px-3 py-2 text-xs text-slate-500">{rate.key}</td>
                <td className="px-3 py-2"><input value={rate.label} onChange={(event) => onUpdate(rate.key, { label: event.target.value })} className="w-full rounded-md border border-slate-200 px-2 py-1" /></td>
                <td className="px-3 py-2"><input value={rate.category} onChange={(event) => onUpdate(rate.key, { category: event.target.value })} className="w-full rounded-md border border-slate-200 px-2 py-1" /></td>
                <td className="px-3 py-2"><input value={rate.unit} onChange={(event) => onUpdate(rate.key, { unit: event.target.value })} className="w-24 rounded-md border border-slate-200 px-2 py-1" /></td>
                <td className="px-3 py-2"><input type="number" value={rate.rate} onChange={(event) => onUpdate(rate.key, { rate: Number(event.target.value) })} className="w-28 rounded-md border border-slate-200 px-2 py-1" /></td>
                <td className="px-3 py-2"><button onClick={() => onRemove(rate.key)} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function VendorDirectory({ vendors, search, onSearch }: { vendors: VendorLink[]; search: string; onSearch: (value: string) => void }) {
  const filtered = vendors.filter((vendor) => `${vendor.name} ${vendor.materialName} ${vendor.rateKey}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <Panel title="Vendor Directory" icon={<Database size={18} />}>
      <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search vendors" className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <div className="grid gap-2">
        {filtered.length ? filtered.slice(0, 200).map((vendor, index) => (
          <div key={`${vendor.name}:${vendor.materialName}:${index}`} className="rounded-md border border-slate-200 p-3">
            <div className="font-medium text-ink">{vendor.name}</div>
            <div className="text-sm text-slate-600">{vendor.materialName}</div>
            <div className="text-xs text-slate-500">{vendor.rateKey}</div>
          </div>
        )) : <EmptyState title="No vendors loaded" text="Import RM rates to populate vendor/material links." />}
      </div>
    </Panel>
  );
}

function TrainingDataView({ imports }: { imports: ImportState }) {
  const byType = groupCounts(imports.corpus.map((row) => row.ptype));
  const storageKb = Math.round(JSON.stringify(imports).length / 1024);
  return (
    <Panel title="Training Data" icon={<Database size={18} />}>
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Products" value={imports.corpus.length} />
        <Stat label="Training rows" value={imports.trainingRows} />
        <Stat label="Rate rows" value={imports.rateRows} />
        <Stat label="Storage KB" value={storageKb} />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
            <span className="font-medium text-ink">{type}</span>
            <span className="text-slate-600">{count}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ModelView({ models, ratioNorms }: { models: TrainedModel[]; ratioNorms: RatioNorm[] }) {
  return (
    <div className="grid gap-4">
      <Panel title="Dimension Models" icon={<Calculator size={18} />}>
        <div className="grid gap-3 md:grid-cols-3">
          <Stat label="Models" value={models.length} />
          <Stat label="Ratio norms" value={ratioNorms.length} />
          <Stat label="Samples" value={sum(models.map((model) => model.samples))} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Bucket</th>
                <th className="px-3 py-2 font-medium">Predictor</th>
                <th className="px-3 py-2 font-medium">Samples</th>
                <th className="px-3 py-2 font-medium">Slope</th>
                <th className="px-3 py-2 font-medium">Intercept</th>
                <th className="px-3 py-2 font-medium">R2</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.key} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{model.key}</td>
                  <td className="px-3 py-2 text-slate-600">{model.predictor}</td>
                  <td className="px-3 py-2 text-slate-600">{model.samples}</td>
                  <td className="px-3 py-2 text-slate-600">{model.slope.toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-600">{model.intercept.toFixed(0)}</td>
                  <td className="px-3 py-2 text-slate-600">{model.r2.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ExportButtonRow({
  title,
  kind,
  formats,
  disabled,
  busy,
  onExport
}: {
  title: string;
  kind: "client-quotation" | "internal-costing" | "pi";
  formats: ExportFormat[];
  disabled: boolean;
  busy: string | null;
  onExport: (kind: "client-quotation" | "internal-costing" | "pi", format: ExportFormat) => void;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="grid grid-cols-3 gap-1">
        {formats.map((format) => {
          const isBusy = busy === `${kind}-${format}`;
          return (
            <button
              key={format}
              type="button"
              disabled={disabled || isBusy}
              onClick={() => onExport(kind, format)}
              className="flex min-h-9 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium uppercase text-slate-700 hover:bg-slate-100 disabled:text-slate-300"
            >
              {isBusy && <Loader2 className="animate-spin" size={13} />}
              {format}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExportHistory({ jobs }: { jobs: ExportJob[] }) {
  const recentJobs = jobs.slice(0, 4);
  return (
    <div className="rounded-md border border-slate-200 p-2">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Export history</div>
      {recentJobs.length ? (
        <div className="space-y-2">
          {recentJobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-slate-700">
                {kindLabel(job.kind)} {exportJobFormat(job).toUpperCase()}
              </span>
              <span className={job.status === "completed" ? "text-emerald-700" : job.status === "failed" ? "text-red-600" : "text-slate-500"}>{job.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-500">No exports yet.</div>
      )}
    </div>
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
      <span className="flex items-center gap-2">
        {busy ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
        {label}
      </span>
      <Library size={15} />
      <input className="sr-only" type="file" accept={accept} disabled={busy} onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])} />
    </label>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-ink" />
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      {label}
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-ink" />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-ink" />
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

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-5 text-center">
      <div className="font-medium text-ink">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{text}</div>
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

function buildSnapshot(input: {
  projectName: string;
  clientName: string;
  imports: ImportState;
  items: BoqItem[];
  costed: CostedRow[];
  message: string;
}): WorkspaceSnapshot {
  return {
    version: 2,
    id: stableProjectId(input.projectName, input.clientName),
    projectName: input.projectName,
    clientName: input.clientName,
    savedAt: new Date().toISOString(),
    imports: input.imports,
    items: input.items,
    costed: input.costed,
    message: input.message
  };
}

function normalizeSnapshot(raw: unknown): WorkspaceSnapshot {
  const input = raw as Partial<WorkspaceSnapshot> & { version?: number; imports?: Partial<ImportState> & { vendors?: VendorLink[] | number } };
  if (!input.imports || !Array.isArray(input.items) || !Array.isArray(input.costed)) throw new Error("Invalid snapshot file.");
  const vendors = Array.isArray(input.imports.vendors) ? input.imports.vendors : [];
  return {
    version: 2,
    id: input.id ?? stableProjectId(input.projectName ?? "Untitled BOQ", input.clientName ?? ""),
    projectName: input.projectName ?? "Untitled BOQ",
    clientName: input.clientName ?? "",
    savedAt: input.savedAt ?? new Date().toISOString(),
    imports: {
      corpus: input.imports.corpus ?? [],
      rates: input.imports.rates ?? [],
      vendors,
      trainingRows: input.imports.trainingRows ?? 0,
      rateRows: input.imports.rateRows ?? 0
    },
    items: input.items,
    costed: input.costed,
    message: input.message ?? "Restored saved workspace."
  };
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function groupCounts(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function kindLabel(kind: string): string {
  if (kind === "client-quotation") return "Client quotation";
  if (kind === "internal-costing") return "Internal costing";
  if (kind === "pi") return "PI";
  return kind;
}

function exportJobFormat(job: ExportJob): string {
  const input = job.input as { format?: unknown };
  return typeof input.format === "string" ? input.format : "";
}

function stableProjectId(projectName: string, clientName: string): string {
  return slug(`${projectName}-${clientName}`) || "untitled-boq";
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function format(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}
