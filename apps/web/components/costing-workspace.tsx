"use client";

import { costItem, rebuildModelsFromCorpus, rebuildRatioNorms } from "@kf/costing-engine";
import { parseBoqCsv, parseBoqWorkbook } from "@kf/importers";
import type { AddedMaterial, BoqItem, CorpusProduct, CostResult, MaterialBreakdownLine, RateItem, RatioNorm, TrainedModel } from "@kf/shared";
import { Calculator, Database, Download, FileUp, Library, Loader2, Percent, RotateCcw, Save, Trash2, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EMBEDDED_CORPUS_PRODUCTS, EMBEDDED_TRAINING_LIBRARY_META } from "../lib/embedded-training-library";

type CostedRow = {
  item: BoqItem;
  result: CostResult;
};

type VendorLink = {
  name: string;
  materialName: string;
  rateKey: string;
  lastRate?: number;
};

type TrainingSourceStat = {
  sourceFile: string;
  rowsRead: number;
  rowsImported: number;
  rowsSkipped: number;
};

type ImportState = {
  corpus: CorpusProduct[];
  rates: RateItem[];
  vendors: VendorLink[];
  trainingSourceStats: TrainingSourceStat[];
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

type ActiveView = "workspace" | "projects" | "rates" | "vendors" | "training" | "models" | "exports" | "editor";

const SNAPSHOT_KEY = "kf-costing-workspace-v2";
const ARCHIVE_KEY = "kf-costing-project-archive-v1";
const MAX_SERVER_BOQ_UPLOAD_BYTES = 4 * 1024 * 1024;
const EMBEDDED_TRAINING_STATS: TrainingSourceStat[] = EMBEDDED_TRAINING_LIBRARY_META.sourceStats.map((source) => ({ ...source }));
const EMPTY_IMPORTS: ImportState = {
  corpus: EMBEDDED_CORPUS_PRODUCTS,
  rates: [],
  vendors: [],
  trainingSourceStats: EMBEDDED_TRAINING_STATS,
  trainingRows: EMBEDDED_TRAINING_LIBRARY_META.rowsRead,
  rateRows: 0
};

export function CostingWorkspace({ initialView = "workspace", showCommandCenter = initialView === "workspace" }: { initialView?: ActiveView; showCommandCenter?: boolean } = {}) {
  const [projectName, setProjectName] = useState("Untitled BOQ");
  const [clientName, setClientName] = useState("");
  const [imports, setImports] = useState<ImportState>(EMPTY_IMPORTS);
  const [items, setItems] = useState<BoqItem[]>([]);
  const [costed, setCosted] = useState<CostedRow[]>([]);
  const [projects, setProjects] = useState<ProjectArchive[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>(initialView);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [rateSearch, setRateSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [globalMargin, setGlobalMargin] = useState(30);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("Embedded RM rates are ready. Load training data, then upload a BOQ.");
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
  const baselineResult = useMemo(
    () => (selectedItem ? costItem({ item: stripMaterialOverrides(selectedItem), rates: imports.rates, corpus: imports.corpus, models, ratioNorms }) : undefined),
    [selectedItem, imports.rates, imports.corpus, models, ratioNorms]
  );
  const reviewRows = useMemo(
    () => costed.filter((row) => row.result.confidence < 0.45 || row.result.matchLevel === "new" || row.result.source === "seed" || manualVarianceLevel(row) !== "none"),
    [costed]
  );

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

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  async function importTraining(file: File) {
    setBusy("training");
    const result = await postFile<{ sourceFile: string; products: CorpusProduct[]; rowsRead: number; rowsImported: number; rowsSkipped: number }>("/api/imports/master-costing", file);
    setImports((current) => ({
      ...current,
      corpus: result.products,
      trainingRows: result.rowsRead,
      trainingSourceStats: [{ sourceFile: result.sourceFile, rowsRead: result.rowsRead, rowsImported: result.rowsImported, rowsSkipped: result.rowsSkipped }]
    }));
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
    try {
      if (file.size > MAX_SERVER_BOQ_UPLOAD_BYTES) {
        const items = await parseBoqFileInBrowser(file);
        applyLoadedBoq(file, items);
        setMessage(`Loaded ${items.length} BOQ rows from ${file.name}. Large file parsed in browser; original file storage was skipped to avoid Vercel upload limits.`);
        return;
      }

      try {
        const result = await postFile<{ items: BoqItem[]; warning?: string }>("/api/boqs/upload", file);
        applyLoadedBoq(file, result.items);
        setMessage(result.warning ?? `Loaded ${result.items.length} BOQ rows from ${file.name}.`);
      } catch (error) {
        const items = await parseBoqFileInBrowser(file);
        applyLoadedBoq(file, items);
        setMessage(`Loaded ${items.length} BOQ rows from ${file.name} in browser. Server upload was unavailable.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload BOQ.");
    } finally {
      setBusy(null);
    }
  }

  function applyLoadedBoq(file: File, loadedItems: BoqItem[]) {
    setItems(loadedItems);
    setSelectedItemId(loadedItems[0]?.id ?? null);
    setCosted([]);
    setProjectName(file.name.replace(/\.[^.]+$/, ""));
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

  async function uploadSpecPdf(file: File, mode: "spec-book" | "pi") {
    setBusy(mode === "pi" ? "pi-pdf" : "spec-pdf");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", mode);
      const response = await fetch("/api/ai/extract-spec-pdf", { method: "POST", body: form });
      const result = (await response.json()) as { sections?: unknown[]; fallbackSections?: unknown[]; warning?: string; error?: string };
      const sections = result.sections ?? result.fallbackSections ?? [];
      if (!response.ok && !sections.length) throw new Error(result.error ?? "Could not extract PDF.");
      setMessage(result.warning ?? `Extracted ${sections.length} ${mode === "pi" ? "PI" : "spec"} rows from ${file.name}. The original PDF and extraction job were stored.`);
      await refreshExportJobs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not extract PDF.");
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

  async function applyGlobalMargin() {
    if (!items.length) {
      setMessage("Upload a BOQ before applying a global margin.");
      return;
    }
    const updatedItems = items.map((item) => ({ ...item, margin: globalMargin }));
    setItems(updatedItems);
    if (costed.length) {
      setBusy("margin");
      const result = await costItems(updatedItems);
      setCosted(result.items);
      setBusy(null);
    }
    setMessage(`Applied ${globalMargin}% margin to ${updatedItems.length} BOQ rows.`);
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

  async function costItems(inputItems: BoqItem[], rateList = imports.rates) {
    const response = await fetch("/api/boqs/cost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: inputItems, rates: rateList, corpus: imports.corpus, models, ratioNorms })
    });
    return (await response.json()) as { items: CostedRow[]; meta: { modelCount: number; ratioNormCount: number } };
  }

  function updateItem(itemId: string, patch: Partial<BoqItem>, options: { keepCosted?: boolean; result?: CostResult } = {}) {
    const previous = items.find((item) => item.id === itemId);
    const nextItem = previous ? { ...previous, ...patch } : undefined;
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
    setCosted((current) => {
      if (!options.keepCosted) return current.filter((row) => row.item.id !== itemId);
      const existing = current.find((row) => row.item.id === itemId);
      if (!existing || !nextItem) return current;
      return current.map((row) => (row.item.id === itemId ? { item: nextItem, result: options.result ?? row.result } : row));
    });
    if (previous) void logCorrections(previous, patch);
    setMessage(options.keepCosted ? "Material override applied." : "Row updated. Re-cost the row or run cost all.");
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

  function addVendorLink() {
    const link: VendorLink = { name: "New vendor", materialName: "Material", rateKey: imports.rates[0]?.key ?? "custom", lastRate: imports.rates[0]?.rate ?? 0 };
    setImports((current) => ({ ...current, vendors: [link, ...current.vendors] }));
    void saveVendors([link]);
  }

  function updateVendorLink(index: number, patch: Partial<VendorLink>) {
    let updated: VendorLink | undefined;
    setImports((current) => ({
      ...current,
      vendors: current.vendors.map((vendor, vendorIndex) => {
        if (vendorIndex !== index) return vendor;
        updated = { ...vendor, ...patch };
        return updated;
      })
    }));
    if (updated) void saveVendors([updated]);
  }

  function removeVendorLink(index: number) {
    const vendor = imports.vendors[index];
    setImports((current) => ({ ...current, vendors: current.vendors.filter((_, vendorIndex) => vendorIndex !== index) }));
    if (vendor) void deleteVendor(vendor);
  }

  async function resetEmbeddedRates() {
    setBusy("rates-reset");
    try {
      const response = await fetch("/api/rates/reset", { method: "POST" });
      const body = (await response.json()) as { rates?: RateItem[]; count?: number; error?: string };
      if (!response.ok || !body.rates) throw new Error(body.error ?? "Could not reset embedded RM rates.");
      setImports((current) => ({ ...current, rates: body.rates ?? current.rates, rateRows: Math.max(current.rateRows, body.count ?? 0) }));
      if (costed.length) {
        const result = await costItems(items, body.rates);
        setCosted(result.items);
      }
      setMessage(`Restored ${body.count ?? body.rates.length} embedded RM rates from the built-in library.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reset embedded RM rates.");
    } finally {
      setBusy(null);
    }
  }

  function resetEmbeddedTraining() {
    setBusy("training-reset");
    setImports((current) => ({
      ...current,
      corpus: EMBEDDED_CORPUS_PRODUCTS,
      trainingRows: EMBEDDED_TRAINING_LIBRARY_META.rowsRead,
      trainingSourceStats: EMBEDDED_TRAINING_STATS
    }));
    setCosted([]);
    setMessage(`Restored ${EMBEDDED_CORPUS_PRODUCTS.length} embedded training products locally. Syncing Supabase in the background.`);
    setBusy(null);
    void syncEmbeddedTraining();
  }

  async function syncEmbeddedTraining() {
    try {
      const body = await fetchJsonWithTimeout<{ products?: CorpusProduct[]; count?: number; error?: string; meta?: { embeddedSourceStats?: TrainingSourceStat[]; embeddedRowsRead?: number } }>("/api/training-sources/reset", { method: "POST" }, 20000);
      if (!body.products) throw new Error(body.error ?? "Could not sync embedded training data.");
      setImports((current) => ({
        ...current,
        corpus: body.products?.length ? body.products : current.corpus,
        trainingRows: body.meta?.embeddedRowsRead ?? current.trainingRows,
        trainingSourceStats: body.meta?.embeddedSourceStats ?? current.trainingSourceStats
      }));
      setMessage(`Supabase training library synced with ${body.count ?? body.products.length} embedded products.`);
    } catch {
      setMessage("Embedded training is ready locally. Supabase sync is still slow or unavailable; try Reset embedded again later.");
    }
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
      const [ratesResponse, vendorsResponse, trainingResponse] = await Promise.all([fetch("/api/rates"), fetch("/api/vendors"), fetch("/api/training-sources")]);
      const ratesBody = ratesResponse.ok ? ((await ratesResponse.json()) as { rates: RateItem[] }) : { rates: [] };
      const vendorsBody = vendorsResponse.ok ? ((await vendorsResponse.json()) as { vendors: VendorLink[] }) : { vendors: [] };
      const trainingBody = trainingResponse.ok
        ? ((await trainingResponse.json()) as { products: CorpusProduct[]; meta?: { embeddedSourceStats?: TrainingSourceStat[]; embeddedRowsRead?: number } })
        : { products: [], meta: undefined };
      setImports((current) => ({
        ...current,
        corpus: current.corpus.length ? current.corpus : trainingBody.products.length ? trainingBody.products : EMBEDDED_CORPUS_PRODUCTS,
        trainingRows: current.trainingRows || trainingBody.meta?.embeddedRowsRead || trainingBody.products.length || EMBEDDED_TRAINING_LIBRARY_META.rowsRead,
        trainingSourceStats: current.trainingSourceStats.length ? current.trainingSourceStats : trainingBody.meta?.embeddedSourceStats ?? EMBEDDED_TRAINING_STATS,
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

  async function deleteVendor(vendor: VendorLink) {
    try {
      const params = new URLSearchParams({ name: vendor.name, materialName: vendor.materialName, rateKey: vendor.rateKey });
      await fetch(`/api/vendors?${params.toString()}`, { method: "DELETE" });
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
      body: JSON.stringify({ rows: costed, format, meta: { projectName, clientName } })
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

  const exportControls = (
    <div className="grid gap-3">
      <ExportButtonRow title="Client quotation" disabled={!costed.length} busy={busy} kind="client-quotation" formats={["csv", "xlsx", "pdf"]} onExport={exportFile} />
      <ExportButtonRow title="Internal costing" disabled={!costed.length} busy={busy} kind="internal-costing" formats={["csv", "xlsx", "pdf"]} onExport={exportFile} />
      <ExportButtonRow title="PI" disabled={!costed.length} busy={busy} kind="pi" formats={["xlsx", "pdf"]} onExport={exportFile} />
      <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3">
        <div className="text-xs font-semibold uppercase text-slate-500">PDF extraction</div>
        <UploadButton label="Extract Spec Book" busy={busy === "spec-pdf"} accept=".pdf" onFile={(file) => uploadSpecPdf(file, "spec-book")} />
        <UploadButton label="Extract PI PDF" busy={busy === "pi-pdf"} accept=".pdf" onFile={(file) => uploadSpecPdf(file, "pi")} />
      </div>
      <ExportHistory jobs={exportJobs} />
      <button onClick={exportSnapshot} className="btn-secondary">
        Save snapshot
      </button>
      <UploadButton label="Load snapshot" busy={busy === "snapshot"} accept=".json" onFile={importSnapshot} />
      <button onClick={clearSavedWorkspace} className="btn-secondary">
        <Trash2 size={15} />
        Clear saved workspace
      </button>
    </div>
  );

  const tabs = (
    <div className="surface flex gap-1 overflow-x-auto p-1.5">
      {[
        ["workspace", "Workspace"],
        ["projects", "Projects"],
        ["rates", "Rates"],
        ["vendors", "Vendors"],
        ["training", "Training"],
        ["models", "Models"],
        ["exports", "Exports"],
        ["editor", "Row Editor"]
      ].map(([key, label]) => (
        <button
          key={key}
          onClick={() => setActiveView(key as ActiveView)}
          className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${activeView === key ? "bg-ink text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const content = (
    <div className="space-y-4">
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

      {activeView === "rates" && (
        <RateLibrary
          rates={imports.rates}
          search={rateSearch}
          busy={busy === "rates-reset"}
          onSearch={setRateSearch}
          onUpdate={updateRate}
          onAdd={addCustomRate}
          onRemove={removeRate}
          onReset={resetEmbeddedRates}
        />
      )}

      {activeView === "vendors" && (
        <VendorDirectory
          vendors={imports.vendors}
          search={vendorSearch}
          onSearch={setVendorSearch}
          onAdd={addVendorLink}
          onUpdate={updateVendorLink}
          onRemove={removeVendorLink}
        />
      )}

      {activeView === "training" && <TrainingDataView imports={imports} busy={busy === "training-reset"} onReset={resetEmbeddedTraining} />}

      {activeView === "models" && <ModelView models={models} ratioNorms={ratioNorms} />}

      {activeView === "exports" && (
        <Panel title="Exports" icon={<Download size={18} />}>
          {exportControls}
        </Panel>
      )}

      {activeView === "editor" && (
        <RowEditor
          item={selectedItem}
          costed={costed.find((row) => row.item.id === selectedItem?.id)}
          baseline={baselineResult}
          rates={imports.rates}
          reviewRows={reviewRows}
          busy={selectedItem ? busy === `cost:${selectedItem.id}` : false}
          aiBusy={selectedItem ? busy === `ai:openai:${selectedItem.id}` || busy === `ai:anthropic:${selectedItem.id}` : false}
          onUpdate={updateItem}
          onRecost={recostItem}
          onAiCost={aiCostItem}
          onSelect={setSelectedItemId}
        />
      )}
    </div>
  );

  if (!showCommandCenter) {
    return (
      <section className="space-y-5">
        {content}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Command Center</h2>
              <p className="mt-1 text-sm text-slate-500">{message}</p>
            </div>
            <div className="text-xs font-medium text-slate-500">
              {lastSaved ? `Autosaved ${new Date(lastSaved).toLocaleString("en-IN")}` : "Autosave ready"}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1.15fr_1fr_1fr_1.05fr]">
          <div className="grid content-start gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Save size={17} />
              Project
            </div>
            <TextInput label="Project" value={projectName} onChange={setProjectName} />
            <TextInput label="Client" value={clientName} onChange={setClientName} />
            <button onClick={saveProject} className="btn-primary">
              <Save size={15} />
              Save to archive
            </button>
          </div>

          <div className="grid content-start gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Database size={17} />
              Libraries
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              RM rates load automatically from the embedded raw material library.
            </div>
            <UploadButton label="Master Costing" busy={busy === "training"} accept=".xlsx,.xls" onFile={importTraining} />
            <UploadButton label="Update RM Rates" busy={busy === "rates"} accept=".xlsx,.xls" onFile={importRates} />
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Corpus" value={imports.corpus.length} />
              <Stat label="Rates" value={imports.rates.length} />
              <Stat label="Vendors" value={imports.vendors.length} />
              <Stat label="Rows" value={imports.trainingRows + imports.rateRows} />
            </div>
          </div>

          <div className="grid content-start gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <FileUp size={17} />
              BOQ
            </div>
            <UploadButton label="Upload BOQ" busy={busy === "boq"} accept=".csv,.xlsx,.xls" onFile={uploadBoq} />
            <UploadButton label="Extract BOQ PDF" busy={busy === "pdf"} accept=".pdf" onFile={uploadBoqPdf} />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Global margin
                <select value={globalMargin} onChange={(event) => setGlobalMargin(Number(event.target.value))} className="field">
                  {[0, 20, 25, 30, 35, 40, 45, 50].map((margin) => (
                    <option key={margin} value={margin}>
                      {margin}%
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" disabled={!items.length || busy === "margin"} onClick={applyGlobalMargin} className="btn-secondary self-end disabled:text-slate-300">
                {busy === "margin" ? <Loader2 className="animate-spin" size={15} /> : <Percent size={15} />}
                Apply
              </button>
            </div>
            <button type="button" disabled={!items.length || busy === "cost"} onClick={costAll} className="btn-primary disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none">
              {busy === "cost" ? <Loader2 className="animate-spin" size={16} /> : <Calculator size={16} />}
              Cost all rows
            </button>
          </div>

          <div className="grid content-start gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Download size={17} />
              Exports
            </div>
            {exportControls}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Raw x Qty" value={totals.raw} />
        <Metric label="Factory x Qty" value={totals.factory} />
        <Metric label="Quotation Total" value={totals.sell} highlight />
      </div>

      {tabs}
      {content}
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
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Costed BOQ</h2>
          <p className="mt-1 text-sm text-slate-500">{costed.length ? `${costed.length} priced rows` : `${items.length} loaded rows waiting for costing`}</p>
        </div>
        <button title="Save snapshot" onClick={onSave} className="btn-secondary min-h-0 p-2">
          <Save size={17} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-5 py-3 font-semibold">Code</th>
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-5 py-3 font-semibold">Dims</th>
              <th className="px-5 py-3 font-semibold">Qty</th>
              <th className="px-5 py-3 font-semibold">Factory</th>
              <th className="px-5 py-3 font-semibold">Sell</th>
              <th className="px-5 py-3 font-semibold">Match</th>
              <th className="px-5 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.item.id} className={`border-t border-slate-100 align-top hover:bg-slate-50/70 ${row.item.id === selectedItemId ? "bg-emerald-50" : ""}`}>
                <td className="px-5 py-3 text-slate-600">{row.item.code ?? ""}</td>
                <td className="px-5 py-3 text-ink">
                  <div className="font-medium">{row.item.name}</div>
                  <div className="mt-1 max-w-xl text-xs text-slate-500">{row.item.spec}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {row.result && row.result.confidence < 0.45 ? <div className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-copper">AI suggested</div> : null}
                    {row.result && manualVarianceLevel(row) !== "none" ? <div className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${manualVarianceLevel(row) === "red" ? "bg-red-50 text-red-700" : "bg-amber-50 text-copper"}`}>Manual variance {manualVariancePct(row)}%</div> : null}
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600">{row.item.dims}</td>
                <td className="px-5 py-3 text-slate-600">{row.item.qty}</td>
                <td className="px-5 py-3 text-slate-700">{row.result ? format(row.result.factory) : "-"}</td>
                <td className="px-5 py-3 font-medium text-ink">{row.result ? format(row.result.sell) : "-"}</td>
                <td className="px-5 py-3 text-slate-600">{row.result ? row.result.matchLabel : "-"}</td>
                <td className="px-5 py-3">
                  <button onClick={() => onSelect(row.item.id)} className="btn-secondary min-h-0 px-3 py-1.5 text-xs">
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
  baseline,
  rates,
  reviewRows,
  busy,
  aiBusy,
  onUpdate,
  onRecost,
  onAiCost,
  onSelect
}: {
  item?: BoqItem;
  costed?: CostedRow;
  baseline?: CostResult;
  rates: RateItem[];
  reviewRows: CostedRow[];
  busy: boolean;
  aiBusy: boolean;
  onUpdate: (itemId: string, patch: Partial<BoqItem>, options?: { keepCosted?: boolean; result?: CostResult }) => void;
  onRecost: (item: BoqItem) => void;
  onAiCost: (item: BoqItem, provider: "openai" | "anthropic") => void;
  onSelect: (itemId: string) => void;
}) {
  if (!item) return <EmptyState title="No BOQ row selected" text="Upload a BOQ, then select a row to edit costing inputs." />;
  const rowItem = item;
  const update = (patch: Partial<BoqItem>) => onUpdate(rowItem.id, patch);
  const baselineRaw = baseline?.raw ?? 0;
  const variance = costed && baselineRaw ? ((costed.result.raw - baselineRaw) / baselineRaw) * 100 : 0;
  const materialRows = buildMaterialRows(costed?.result.breakdown ?? [], baseline?.breakdown ?? [], rowItem);

  function applyMaterialPatch(patch: Partial<BoqItem>, result: CostResult) {
    onUpdate(rowItem.id, patch, { keepCosted: true, result });
  }

  function updateMaterial(row: EditableMaterialLine, patch: Partial<MaterialBreakdownLine>) {
    if (!costed) return;
    const nextBreakdown = costed.result.breakdown.map((line, index) => {
      if (index !== row.index) return line;
      const next = { ...line, ...patch };
      return { ...next, amount: roundMoney(next.qty * next.rate) };
    });
    const nextResult = recalcResult(costed.result, nextBreakdown, rowItem);
    applyMaterialPatch(buildMaterialPatch(rowItem, row, patch), nextResult);
  }

  function removeMaterial(row: EditableMaterialLine) {
    if (!costed) return;
    const nextBreakdown = costed.result.breakdown.filter((_, index) => index !== row.index);
    const nextResult = recalcResult(costed.result, nextBreakdown, rowItem);
    if (row.addedIndex !== undefined) {
      applyMaterialPatch({ addedMaterials: (rowItem.addedMaterials ?? []).filter((_, index) => index !== row.addedIndex) }, nextResult);
      return;
    }
    applyMaterialPatch({ qtyOverrides: { ...(rowItem.qtyOverrides ?? {}), [row.baseKey]: 0 } }, nextResult);
  }

  function addMaterial() {
    if (!costed) return;
    const rate = rates[0];
    const material: AddedMaterial = {
      materialKey: rate?.key ?? "custom_material",
      label: rate?.label ?? "Custom material",
      qty: 1,
      rate: rate?.rate ?? 0,
      unit: rate?.unit ?? "NOS"
    };
    const nextLine: MaterialBreakdownLine = {
      materialKey: material.materialKey,
      label: material.label ?? material.materialKey,
      qty: material.qty,
      unit: material.unit ?? "NOS",
      rate: material.rate ?? 0,
      amount: roundMoney(material.qty * (material.rate ?? 0)),
      source: "added"
    };
    const nextBreakdown = [...costed.result.breakdown, nextLine];
    applyMaterialPatch({ addedMaterials: [...(rowItem.addedMaterials ?? []), material] }, recalcResult(costed.result, nextBreakdown, rowItem));
  }

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
          className="btn-primary mt-4 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"
        >
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Calculator size={16} />}
          Re-cost row
        </button>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button disabled={aiBusy} onClick={() => onAiCost(item, "openai")} className="btn-secondary disabled:text-slate-300">
            OpenAI cost
          </button>
          <button disabled={aiBusy} onClick={() => onAiCost(item, "anthropic")} className="btn-secondary disabled:text-slate-300">
            Claude cost
          </button>
        </div>
      </Panel>

      <Panel title="Material Breakdown" icon={<Library size={18} />}>
        {costed ? (
          <div className="space-y-2">
            <Metric label="Factory" value={costed.result.factory} />
            <Metric label="Sell" value={costed.result.sell} />
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Baseline raw {format(baselineRaw)} | Current raw {format(costed.result.raw)} | Variance{" "}
              <span className={Math.abs(variance) > 15 ? "font-semibold text-copper" : "font-semibold text-emerald-700"}>{variance.toFixed(1)}%</span>
            </div>
            <button type="button" onClick={addMaterial} className="btn-secondary w-full">
              Add material row
            </button>
            <div className="max-h-[520px] overflow-auto rounded-md border border-slate-200">
              {materialRows.map((row) => (
                <MaterialEditorRow key={`${row.index}:${row.materialKey}:${row.label}`} row={row} rates={rates} onUpdate={(patch) => updateMaterial(row, patch)} onRemove={() => removeMaterial(row)} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="No current costing" text="Re-cost this row to inspect its material breakdown." />
        )}
      </Panel>

      <div className="lg:col-span-2">
        <Panel title="Confidence Review Queue" icon={<Database size={18} />}>
          {reviewRows.length ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {reviewRows.map((row) => (
                <button key={row.item.id} type="button" onClick={() => onSelect(row.item.id)} className="rounded-md border border-slate-200 bg-white p-3 text-left hover:border-slate-300 hover:bg-slate-50">
                  <div className="truncate text-sm font-medium text-ink">{row.item.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{row.result.matchLabel}</div>
                  <div className="mt-2 text-xs font-semibold text-copper">Confidence {(row.result.confidence * 100).toFixed(0)}%</div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No review rows" text="Low confidence and new seed estimates will appear here after costing." />
          )}
        </Panel>
      </div>
    </div>
  );
}

type EditableMaterialLine = MaterialBreakdownLine & {
  index: number;
  baseKey: string;
  addedIndex?: number;
  baselineAmount: number;
  variancePct: number;
};

function MaterialEditorRow({
  row,
  rates,
  onUpdate,
  onRemove
}: {
  row: EditableMaterialLine;
  rates: RateItem[];
  onUpdate: (patch: Partial<MaterialBreakdownLine>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border-t border-slate-100 p-3 first:border-t-0">
      <div className="grid gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink">{row.label}</div>
            <div className="text-xs text-slate-500">
              Base {format(row.baselineAmount)} | Variance{" "}
              <span className={Math.abs(row.variancePct) > 15 ? "font-semibold text-copper" : "font-semibold text-emerald-700"}>{row.variancePct.toFixed(1)}%</span>
            </div>
          </div>
          <button type="button" onClick={onRemove} className="btn-secondary min-h-0 px-2 py-1 text-xs">
            Remove
          </button>
        </div>
        <label className="grid gap-1 text-xs font-medium text-slate-600">
          Material key
          <select
            value={row.materialKey}
            onChange={(event) => {
              const rate = rates.find((item) => item.key === event.target.value);
              onUpdate({ materialKey: event.target.value, label: rate?.label ?? event.target.value, unit: rate?.unit ?? row.unit, rate: rate?.rate ?? row.rate });
            }}
            className="field px-2 py-2 text-xs font-normal"
          >
            <option value={row.materialKey}>{row.materialKey}</option>
            {rates
              .filter((rate) => rate.key !== row.materialKey)
              .slice(0, 400)
              .map((rate) => (
                <option key={rate.key} value={rate.key}>
                  {rate.key} - {rate.label}
                </option>
              ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Qty" value={row.qty} onChange={(value) => onUpdate({ qty: value })} />
          <NumberInput label="Rate" value={row.rate} onChange={(value) => onUpdate({ rate: value })} />
          <TextInput label="Unit" value={row.unit} onChange={(value) => onUpdate({ unit: value })} />
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            Type
            <select value={row.source} onChange={(event) => onUpdate({ source: event.target.value as MaterialBreakdownLine["source"] })} className="field px-2 py-2 text-xs font-normal">
              {["estimate", "override", "ai", "added", "spec", "fixed", "geometry", "dataset", "seed", "model", "user"].map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-right text-sm font-semibold text-ink">{format(row.amount)}</div>
      </div>
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
        <button disabled={!projects.length} onClick={onExportAll} className="btn-secondary disabled:text-slate-300">
          Export all projects
        </button>
      </div>
      <div className="grid gap-2">
        {projects.length ? projects.map((project) => (
          <div key={project.id} className="rounded-md border border-slate-200 bg-white p-3 hover:border-slate-300">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">{project.name}</div>
                <div className="text-sm text-slate-500">{project.clientName || "No client"} | {project.itemCount} rows | {format(project.total)}</div>
                <div className="text-xs text-slate-500">{new Date(project.savedAt).toLocaleString("en-IN")}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onLoad(project)} className="btn-primary min-h-0 px-3 py-1.5 text-xs">Load</button>
                <button onClick={() => onDelete(project.id)} className="btn-secondary min-h-0 px-3 py-1.5 text-xs">Delete</button>
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
  busy,
  onSearch,
  onUpdate,
  onAdd,
  onRemove,
  onReset
}: {
  rates: RateItem[];
  search: string;
  busy: boolean;
  onSearch: (value: string) => void;
  onUpdate: (key: string, patch: Partial<RateItem>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onReset: () => void | Promise<void>;
}) {
  const filtered = rates.filter((rate) => `${rate.key} ${rate.label} ${rate.category}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <Panel title="Rate Library" icon={<Library size={18} />}>
      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search rates" className="field" />
        <button onClick={onAdd} className="btn-primary">Add rate</button>
        <button disabled={busy} onClick={onReset} className="btn-secondary disabled:text-slate-300">
          {busy ? <Loader2 className="animate-spin" size={15} /> : <RotateCcw size={15} />}
          Reset embedded
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="table-head">
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
              <tr key={rate.key} className="border-t border-slate-100 hover:bg-slate-50/70">
                <td className="px-3 py-2 text-xs text-slate-500">{rate.key}</td>
                <td className="px-3 py-2"><input value={rate.label} onChange={(event) => onUpdate(rate.key, { label: event.target.value })} className="field px-2 py-1" /></td>
                <td className="px-3 py-2"><input value={rate.category} onChange={(event) => onUpdate(rate.key, { category: event.target.value })} className="field px-2 py-1" /></td>
                <td className="px-3 py-2"><input value={rate.unit} onChange={(event) => onUpdate(rate.key, { unit: event.target.value })} className="field w-24 px-2 py-1" /></td>
                <td className="px-3 py-2"><input type="number" value={rate.rate} onChange={(event) => onUpdate(rate.key, { rate: Number(event.target.value) })} className="field w-28 px-2 py-1" /></td>
                <td className="px-3 py-2"><button onClick={() => onRemove(rate.key)} className="btn-secondary min-h-0 px-2 py-1 text-xs">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function VendorDirectory({
  vendors,
  search,
  onSearch,
  onAdd,
  onUpdate,
  onRemove
}: {
  vendors: VendorLink[];
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<VendorLink>) => void;
  onRemove: (index: number) => void;
}) {
  const filtered = vendors
    .map((vendor, index) => ({ ...vendor, index }))
    .filter((vendor) => `${vendor.name} ${vendor.materialName} ${vendor.rateKey}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <Panel title="Vendor Directory" icon={<Database size={18} />}>
      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto]">
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search vendors" className="field" />
        <button onClick={onAdd} className="btn-primary">Add vendor</button>
      </div>
      <div className="overflow-x-auto">
        {filtered.length ? (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-2 font-medium">Vendor</th>
                <th className="px-3 py-2 font-medium">Material</th>
                <th className="px-3 py-2 font-medium">Rate key</th>
                <th className="px-3 py-2 font-medium">Last rate</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((vendor) => (
                <tr key={`${vendor.name}:${vendor.materialName}:${vendor.rateKey}:${vendor.index}`} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-3 py-2"><input value={vendor.name} onChange={(event) => onUpdate(vendor.index, { name: event.target.value })} className="field px-2 py-1" /></td>
                  <td className="px-3 py-2"><input value={vendor.materialName} onChange={(event) => onUpdate(vendor.index, { materialName: event.target.value })} className="field px-2 py-1" /></td>
                  <td className="px-3 py-2"><input value={vendor.rateKey} onChange={(event) => onUpdate(vendor.index, { rateKey: event.target.value })} className="field px-2 py-1" /></td>
                  <td className="px-3 py-2"><input type="number" value={vendor.lastRate ?? 0} onChange={(event) => onUpdate(vendor.index, { lastRate: Number(event.target.value) })} className="field w-28 px-2 py-1" /></td>
                  <td className="px-3 py-2"><button onClick={() => onRemove(vendor.index)} className="btn-secondary min-h-0 px-2 py-1 text-xs">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState title="No vendors loaded" text="Embedded vendors load automatically from the RM library." />}
      </div>
    </Panel>
  );
}

function TrainingDataView({ imports, busy, onReset }: { imports: ImportState; busy: boolean; onReset: () => void | Promise<void> }) {
  const byType = groupCounts(imports.corpus.map((row) => row.ptype));
  const storageKb = Math.round(JSON.stringify(imports).length / 1024);
  return (
    <Panel title="Training Data" icon={<Database size={18} />}>
      <div className="mb-4 flex flex-col gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
        <span>Default training products load automatically from the embedded costing corpus.</span>
        <button disabled={busy} onClick={onReset} className="btn-secondary bg-white disabled:text-slate-300">
          {busy ? <Loader2 className="animate-spin" size={15} /> : <RotateCcw size={15} />}
          Reset embedded
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Products" value={imports.corpus.length} />
        <Stat label="Training rows" value={imports.trainingRows} />
        <Stat label="Rate rows" value={imports.rateRows} />
        <Stat label="Storage KB" value={storageKb} />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
            <span className="font-medium text-ink">{type}</span>
            <span className="text-slate-600">{count}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-ink">Embedded source workbooks</div>
        <div className="divide-y divide-slate-100">
          {imports.trainingSourceStats.length ? imports.trainingSourceStats.map((source) => (
            <div key={source.sourceFile} className="grid gap-2 px-3 py-2 text-sm text-slate-600 sm:grid-cols-[1fr_auto_auto_auto]">
              <span className="font-medium text-ink">{source.sourceFile}</span>
              <span>{source.rowsRead.toLocaleString("en-IN")} rows</span>
              <span>{source.rowsImported.toLocaleString("en-IN")} products</span>
              <span>{source.rowsSkipped.toLocaleString("en-IN")} skipped</span>
            </div>
          )) : (
            <div className="px-3 py-3 text-sm text-slate-500">Source counts will appear after embedded training data loads.</div>
          )}
        </div>
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
            <thead className="table-head">
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
                <tr key={model.key} className="border-t border-slate-100 hover:bg-slate-50/70">
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
    <div className="surface p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function UploadButton({ label, accept, busy, onFile }: { label: string; accept: string; busy: boolean; onFile: (file: File) => void }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50">
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
      <input value={value} onChange={(event) => onChange(event.target.value)} className="field font-normal" />
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      {label}
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="field font-normal" />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="field font-normal" />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
      <div className="text-sm font-semibold text-ink">{value.toLocaleString("en-IN")}</div>
      <div className="truncate text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`surface p-4 ${highlight ? "border-ink bg-ink text-white" : ""}`}>
      <div className={`text-xs font-semibold uppercase tracking-wide ${highlight ? "text-slate-300" : "text-slate-500"}`}>{label}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${highlight ? "text-white" : "text-ink"}`}>{format(value)}</div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
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

async function parseBoqFileInBrowser(file: File): Promise<BoqItem[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseBoqCsv(await file.text());
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseBoqWorkbook(new Uint8Array(await file.arrayBuffer()));
  throw new Error("Supported BOQ formats are CSV, XLSX, and XLS.");
}

async function fetchJsonWithTimeout<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(body.error ?? "Request failed.");
    return body;
  } finally {
    window.clearTimeout(timeout);
  }
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
      corpus: input.imports.corpus?.length ? input.imports.corpus : EMBEDDED_CORPUS_PRODUCTS,
      rates: input.imports.rates ?? [],
      vendors,
      trainingSourceStats: input.imports.trainingSourceStats?.length ? input.imports.trainingSourceStats : EMBEDDED_TRAINING_STATS,
      trainingRows: input.imports.trainingRows || EMBEDDED_TRAINING_LIBRARY_META.rowsRead,
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

function buildMaterialRows(current: MaterialBreakdownLine[], baseline: MaterialBreakdownLine[], item: BoqItem): EditableMaterialLine[] {
  let addedIndex = 0;
  return current.map((line, index) => {
    const isAdded = line.source === "added";
    const baseKey = findBaseMaterialKey(item, line.materialKey);
    const baselineLine = baseline.find((entry) => entry.materialKey === baseKey || entry.materialKey === line.materialKey);
    const baselineAmount = baselineLine?.amount ?? 0;
    const variancePct = baselineAmount ? ((line.amount - baselineAmount) / baselineAmount) * 100 : 0;
    const row: EditableMaterialLine = {
      ...line,
      index,
      baseKey,
      addedIndex: isAdded ? addedIndex : undefined,
      baselineAmount,
      variancePct
    };
    if (isAdded) addedIndex += 1;
    return row;
  });
}

function buildMaterialPatch(item: BoqItem, row: EditableMaterialLine, patch: Partial<MaterialBreakdownLine>): Partial<BoqItem> {
  if (row.addedIndex !== undefined) {
    const addedMaterials = [...(item.addedMaterials ?? [])];
    const existing = addedMaterials[row.addedIndex] ?? { materialKey: row.materialKey, label: row.label, qty: row.qty, rate: row.rate, unit: row.unit };
    addedMaterials[row.addedIndex] = {
      ...existing,
      materialKey: patch.materialKey ?? existing.materialKey,
      label: patch.label ?? existing.label,
      qty: patch.qty ?? existing.qty,
      rate: patch.rate ?? existing.rate,
      unit: patch.unit ?? existing.unit
    };
    return { addedMaterials };
  }

  const nextKey = patch.materialKey ?? row.materialKey;
  const materialOverrides = nextKey !== row.baseKey ? { ...(item.materialOverrides ?? {}), [row.baseKey]: nextKey } : item.materialOverrides;
  const qtyOverrides = patch.qty !== undefined ? { ...(item.qtyOverrides ?? {}), [row.baseKey]: patch.qty } : item.qtyOverrides;
  const rateOverrides = patch.rate !== undefined ? { ...(item.rateOverrides ?? {}), [nextKey]: patch.rate } : item.rateOverrides;
  return { materialOverrides, qtyOverrides, rateOverrides };
}

function recalcResult(result: CostResult, breakdown: MaterialBreakdownLine[], item: BoqItem): CostResult {
  const raw = item.rawOverride ?? roundMoney(breakdown.reduce((total, line) => total + line.amount, 0));
  const factory = item.manualFac ?? roundMoney(raw * 1.65);
  const margin = Math.min(85, Math.max(0, item.margin));
  const sell = roundMoney(factory / (1 - margin / 100));
  return {
    ...result,
    raw,
    factory,
    sell,
    total: roundMoney(sell * item.qty),
    breakdown: breakdown.map((line) => ({ ...line, amount: roundMoney(line.qty * line.rate) }))
  };
}

function findBaseMaterialKey(item: BoqItem, materialKey: string): string {
  const mapped = Object.entries(item.materialOverrides ?? {}).find(([, overrideKey]) => overrideKey === materialKey);
  return mapped?.[0] ?? materialKey;
}

function stripMaterialOverrides(item: BoqItem): BoqItem {
  const { qtyOverrides, rateOverrides, materialOverrides, addedMaterials, rawOverride, ...rest } = item;
  return rest;
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

function manualVariancePct(row: CostedRow): number {
  const manual = row.item.manualFac ?? 0;
  if (!manual) return 0;
  const algorithmFactory = roundMoney(row.result.raw * 1.65);
  return Math.round(((algorithmFactory - manual) / manual) * 100);
}

function manualVarianceLevel(row: CostedRow): "none" | "amber" | "red" {
  const abs = Math.abs(manualVariancePct(row));
  if (abs > 30) return "red";
  if (abs > 20) return "amber";
  return "none";
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

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function format(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}
