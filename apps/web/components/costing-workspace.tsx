"use client";

import { classify, costItem, inferCTFromSpec, rebuildModelsFromCorpus, rebuildRatioNorms } from "@kf/costing-engine";
import { rowsFromBoqCsv, rowsFromBoqWorkbook } from "@kf/importers";
import type { AddedMaterial, BoqItem, CorpusProduct, CostResult, MaterialBreakdownLine, RateItem, RatioNorm, TrainedModel } from "@kf/shared";
import { Calculator, Database, Download, FileUp, Library, Loader2, Percent, RotateCcw, Save, Trash2, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EMBEDDED_CORPUS_PRODUCTS, EMBEDDED_TRAINING_LIBRARY_META } from "../lib/embedded-training-library";

type CostedRow = {
  item: BoqItem;
  result: CostResult;
};

type PiItem = {
  id: string;
  code: string;
  name: string;
  dims: string;
  spec: string;
  qty: number;
  unitPrice: number;
  source: "boq" | "spec-book" | "pi-pdf" | "manual";
};

type ExtractedSpecRow = {
  section?: string;
  itemCode?: string;
  itemName?: string;
  dimensions?: string;
  specification?: string;
  finish?: string;
  quantity?: number | string;
  unit?: string;
  amount?: number | string;
};

type BoqColumnKey = "code" | "name" | "dims" | "qty" | "spec" | "aiSpec" | "ct" | "rawMat" | "image" | "dimsSource";

type BoqColumnMapping = Record<BoqColumnKey, string>;

type PdfPageImage = {
  page: number;
  base64: string;
  mimeType: string;
};

type PendingBoqReview = {
  sourceName: string;
  sourceType: "workbook" | "pdf-vision" | "pdf-text";
  rows: Record<string, unknown>[];
  headers: string[];
  mapping: BoqColumnMapping;
  pageImages?: PdfPageImage[];
};

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(input: { data: ArrayBuffer }): {
    promise: Promise<{
      numPages: number;
      getPage(pageNumber: number): Promise<{
        getViewport(input: { scale: number }): { width: number; height: number };
        render(input: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> };
      }>;
    }>;
  };
};

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

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
  piItems: PiItem[];
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

type ActiveView = "workspace" | "projects" | "rates" | "vendors" | "training" | "models" | "exports" | "editor" | "pi";

const SNAPSHOT_KEY = "kf-costing-workspace-v2";
const ARCHIVE_KEY = "kf-costing-project-archive-v1";
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
  const [piItems, setPiItems] = useState<PiItem[]>([]);
  const [pendingBoqReview, setPendingBoqReview] = useState<PendingBoqReview | null>(null);
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
    const snapshot = buildSnapshot({ projectName, clientName, imports, items, costed, piItems, message });
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
        setLastSaved(snapshot.savedAt);
      } catch {
        setMessage("Autosave storage is full. Export a project snapshot before continuing.");
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [projectName, clientName, imports, items, costed, piItems, message]);

  useEffect(() => {
    if (!hydrated.current) return;
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  async function importTraining(file: File) {
    setBusy("training");
    try {
      const result = await postFile<{ sourceFile: string; products: CorpusProduct[]; rowsRead: number; rowsImported: number; rowsSkipped: number }>("/api/imports/master-costing", file);
      setImports((current) => ({
        ...current,
        corpus: result.products,
        trainingRows: result.rowsRead,
        trainingSourceStats: [{ sourceFile: result.sourceFile, rowsRead: result.rowsRead, rowsImported: result.rowsImported, rowsSkipped: result.rowsSkipped }]
      }));
      setMessage(`Imported ${result.rowsImported} corpus products from ${file.name}.`);
      void saveTrainingSource(result.sourceFile, result.rowsRead, result.products);
    } catch (error) {
      setMessage(error instanceof Error ? cleanErrorText(error.message) : "Training import failed.");
    } finally {
      setBusy(null);
    }
  }

  async function importRates(file: File) {
    setBusy("rates");
    try {
      const result = await postFile<{ rates: RateItem[]; vendors: VendorLink[]; rowsRead: number; rowsImported: number }>("/api/imports/rm-rates", file);
      setImports((current) => ({ ...current, rates: result.rates, vendors: result.vendors, rateRows: result.rowsRead }));
      setMessage(`Imported ${result.rowsImported} rate keys and ${result.vendors.length} vendor/material links.`);
      void saveRates(result.rates);
      void saveVendors(result.vendors);
    } catch (error) {
      setMessage(error instanceof Error ? cleanErrorText(error.message) : "Rate import failed.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadBoq(file: File) {
    setBusy("boq");
    try {
      const rows = await readBoqRowsForMapping(file);
      stageBoqReview({ sourceName: file.name, sourceType: "workbook", rows });
      setMessage(`Detected ${rows.length} BOQ rows from ${file.name}. Review the column mapping, then process.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload BOQ.");
    } finally {
      setBusy(null);
    }
  }

  function applyLoadedBoq(file: File, loadedItems: BoqItem[]) {
    const cleanItems = sanitizeBoqItems(loadedItems);
    setPendingBoqReview(null);
    setItems(cleanItems);
    setSelectedItemId(cleanItems[0]?.id ?? null);
    setCosted([]);
    setPiItems([]);
    setProjectName(file.name.replace(/\.[^.]+$/, ""));
  }

  function stageBoqReview(input: Omit<PendingBoqReview, "headers" | "mapping">) {
    const rows = input.rows.filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
    const headers = collectHeaders(rows);
    setPendingBoqReview({
      ...input,
      rows,
      headers,
      mapping: detectBoqMapping(headers)
    });
    setProjectName(input.sourceName.replace(/\.[^.]+$/, ""));
    setActiveView("workspace");
  }

  function updateBoqMapping(key: BoqColumnKey, header: string) {
    setPendingBoqReview((current) => current ? { ...current, mapping: { ...current.mapping, [key]: header } } : current);
  }

  async function enrichPendingBoq() {
    if (!pendingBoqReview) return;
    if (!pendingBoqReview.pageImages?.length) {
      setMessage("AI spec enrichment needs a PDF upload with rendered page images.");
      return;
    }
    setBusy("boq-enrich");
    try {
      const result = await fetchJsonWithTimeout<{ enrichments?: unknown[] }>("/api/ai/extract-pdf-vision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "boq-enrichment",
          filename: pendingBoqReview.sourceName,
          rows: pendingBoqReview.rows,
          pageImages: pendingBoqReview.pageImages
        })
      }, 120000);
      const rows = await attachVisionImages(mergeBoqEnrichments(pendingBoqReview.rows, result.enrichments ?? []), pendingBoqReview.pageImages);
      setPendingBoqReview((current) => current ? { ...current, rows, headers: collectHeaders(rows), mapping: detectBoqMapping(collectHeaders(rows), current.mapping) } : current);
      setMessage(`AI enriched ${result.enrichments?.length ?? 0} BOQ rows. Review and process.`);
    } catch (error) {
      setMessage(error instanceof Error ? `AI enrichment failed: ${cleanErrorText(error.message)}` : "AI enrichment failed.");
    } finally {
      setBusy(null);
    }
  }

  function processPendingBoq() {
    if (!pendingBoqReview) return;
    const mappedItems = boqItemsFromMappedRows(pendingBoqReview.rows, pendingBoqReview.mapping, globalMargin);
    if (!mappedItems.length) {
      setMessage("No valid furniture rows found. Check Product Name and Qty mapping.");
      return;
    }
    const cleanItems = sanitizeBoqItems(mappedItems);
    setPendingBoqReview(null);
    setItems(cleanItems);
    setSelectedItemId(cleanItems[0]?.id ?? null);
    setCosted([]);
    setPiItems([]);
    setMessage(`Processed ${cleanItems.length} mapped BOQ rows. Run Cost BOQ when ready.`);
  }

  async function uploadBoqPdf(file: File) {
    setBusy("pdf");
    try {
      let pageImages: PdfPageImage[] = [];
      try {
        pageImages = await renderPdfPageImages(file);
      } catch (renderError) {
        const result = await postFile<{ items?: BoqItem[]; fallbackItems?: BoqItem[]; warning?: string; error?: string }>("/api/ai/extract-boq-pdf", file);
        const rows = rowsFromBoqItems(result.items ?? result.fallbackItems ?? []);
        stageBoqReview({ sourceName: file.name, sourceType: "pdf-text", rows });
        setMessage(result.warning ?? `Text extracted ${rows.length} BOQ rows from ${file.name}. PDF vision rendering was unavailable: ${cleanErrorText(renderError instanceof Error ? renderError.message : "unknown error")}`);
        return;
      }
      try {
        const result = await fetchJsonWithTimeout<{ rows?: Record<string, unknown>[]; items?: BoqItem[]; warning?: string }>("/api/ai/extract-pdf-vision", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode: "boq", filename: file.name, pageImages })
        }, 120000);
        const rows = await attachVisionImages(result.rows?.length ? result.rows : rowsFromBoqItems(result.items ?? []), pageImages);
        if (!rows.length) throw new Error("Vision extraction returned no BOQ rows.");
        stageBoqReview({ sourceName: file.name, sourceType: "pdf-vision", rows, pageImages });
        setMessage(`Vision extracted ${rows.length} BOQ rows from ${file.name}. Review mapping, then process.`);
      } catch (visionError) {
        const result = await postFile<{ items?: BoqItem[]; fallbackItems?: BoqItem[]; warning?: string; error?: string }>("/api/ai/extract-boq-pdf", file);
        const rows = rowsFromBoqItems(result.items ?? result.fallbackItems ?? []);
        stageBoqReview({ sourceName: file.name, sourceType: "pdf-text", rows, pageImages });
        setMessage(result.warning ?? `Text extracted ${rows.length} BOQ rows from ${file.name}. Vision was unavailable: ${cleanErrorText(visionError instanceof Error ? visionError.message : "unknown error")}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not extract BOQ PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadSpecPdf(file: File, mode: "spec-book" | "pi") {
    setBusy(mode === "pi" ? "pi-pdf" : "spec-pdf");
    try {
      let sections: ExtractedSpecRow[] = [];
      let warning = "";
      try {
        const pageImages = await renderPdfPageImages(file);
        const result = await fetchJsonWithTimeout<{ sections?: ExtractedSpecRow[] }>("/api/ai/extract-pdf-vision", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode, filename: file.name, pageImages })
        }, 120000);
        sections = result.sections ?? [];
        if (!sections.length) throw new Error("Vision extraction returned no rows.");
      } catch (visionError) {
        const form = new FormData();
        form.append("file", file);
        form.append("mode", mode);
        const response = await fetch("/api/ai/extract-spec-pdf", { method: "POST", body: form });
        const result = (await response.json()) as { sections?: ExtractedSpecRow[]; fallbackSections?: ExtractedSpecRow[]; warning?: string; error?: string };
        sections = result.sections ?? result.fallbackSections ?? [];
        warning = result.warning ?? `Vision extraction was unavailable: ${cleanErrorText(visionError instanceof Error ? visionError.message : "unknown error")}`;
        if (!response.ok && !sections.length) throw new Error(result.error ?? "Could not extract PDF.");
      }
      const extractedPiItems = piItemsFromExtractedSections(sections, mode === "pi" ? "pi-pdf" : "spec-book");
      setPiItems(extractedPiItems);
      setActiveView("pi");
      setMessage(warning || `Vision extracted ${extractedPiItems.length} ${mode === "pi" ? "PI" : "spec book"} rows from ${file.name}. Review prices, then export PI.`);
      await refreshExportJobs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not extract PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function costAll() {
    setBusy("cost");
    try {
      const cleanItems = sanitizeBoqItems(items);
      if (cleanItems.length !== items.length) {
        setItems(cleanItems);
        setSelectedItemId(cleanItems[0]?.id ?? null);
      }
      const result = await costItems(cleanItems);
      setCosted(result.items);
      setMessage(`Costed ${result.items.length} rows using ${result.meta.modelCount} models and ${result.meta.ratioNormCount} ratio norms.`);
    } catch (error) {
      setMessage(error instanceof Error ? `Costing failed: ${cleanErrorText(error.message)}` : "Costing failed.");
    } finally {
      setBusy(null);
    }
  }

  function pushCostedToPi() {
    if (!costed.length) {
      setMessage("Cost the BOQ first, then push it to the PI table.");
      return;
    }
    const codePrefix = (projectName || "KF").replace(/[^a-z0-9-]/gi, "").toUpperCase().slice(0, 8) || "KF";
    const nextPiItems = costed.map(({ item, result }, index) => ({
      id: `pi_${item.id}_${index}`,
      code: item.code || `${codePrefix}-${String(index + 1).padStart(3, "0")}`,
      name: item.name || "Item",
      dims: item.dims || "",
      spec: (item.aiSpec || item.spec || "").slice(0, 320),
      qty: item.qty || 1,
      unitPrice: Math.round(result.sell || 0),
      source: "boq" as const
    }));
    setPiItems(nextPiItems);
    setActiveView("pi");
    setMessage(`Pushed ${nextPiItems.length} costed BOQ rows to the PI table. Review rows, then export PI.`);
  }

  async function applyGlobalMargin() {
    if (!items.length) {
      setMessage("Upload a BOQ before applying a global margin.");
      return;
    }
    const updatedItems = items.map((item) => ({ ...item, margin: globalMargin }));
    setItems(updatedItems);
    let recostFailed = false;
    if (costed.length) {
      setBusy("margin");
      try {
        const result = await costItems(updatedItems);
        setCosted(result.items);
      } catch (error) {
        recostFailed = true;
        setMessage(error instanceof Error ? `Margin applied, but re-cost failed: ${cleanErrorText(error.message)}` : "Margin applied, but re-cost failed.");
      } finally {
        setBusy(null);
      }
    }
    if (!recostFailed) setMessage(`Applied ${globalMargin}% margin to ${updatedItems.length} BOQ rows.`);
  }

  function updatePiItem(itemId: string, patch: Partial<PiItem>) {
    setPiItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  }

  function addPiItem() {
    setPiItems((current) => [
      ...current,
      { id: `pi_manual_${Date.now()}`, code: "", name: "New item", dims: "", spec: "", qty: 1, unitPrice: 0, source: "manual" }
    ]);
  }

  function removePiItem(itemId: string) {
    setPiItems((current) => current.filter((item) => item.id !== itemId));
  }

  async function recostItem(item: BoqItem) {
    setBusy(`cost:${item.id}`);
    try {
      const result = await costItems([item]);
      setCosted((current) => [...current.filter((row) => row.item.id !== item.id), result.items[0]]);
      setMessage(`Recosted ${item.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? `Re-cost failed: ${cleanErrorText(error.message)}` : "Re-cost failed.");
    } finally {
      setBusy(null);
    }
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
    const body = await response.json() as { items?: CostedRow[]; meta?: { modelCount: number; ratioNormCount: number }; error?: string };
    if (!response.ok || !body.items || !body.meta) throw new Error(body.error ?? "Costing request failed.");
    return body as { items: CostedRow[]; meta: { modelCount: number; ratioNormCount: number } };
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
    const snapshot = buildSnapshot({ projectName, clientName, imports, items, costed, piItems, message });
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
    const snapshot = buildSnapshot({ projectName, clientName, imports, items, costed, piItems, message });
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
    setPiItems([]);
    setSelectedItemId(null);
    setLastSaved(null);
    setMessage("Saved workspace cleared.");
  }

  async function exportFile(kind: "client-quotation" | "internal-costing" | "pi", format: ExportFormat) {
    const exportRows = kind === "pi" && piItems.length ? piItemsToCostedRows(piItems) : costed;
    if (!exportRows.length) {
      setMessage(kind === "pi" ? "Push costed BOQ rows to PI before exporting." : "Cost the BOQ before exporting.");
      return;
    }
    setBusy(`${kind}-${format}`);
    try {
      const response = await fetch(`/api/exports/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: exportRows, format, meta: { projectName, clientName } })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Export failed.");
      }
      const blob = await response.blob();
      downloadBrowserBlob(blob, filenameFromResponse(response, `${kind === "pi" ? "proforma-invoice" : kind}.${format}`));
      await refreshExportJobs();
      setMessage(`Exported ${kindLabel(kind)} ${format.toUpperCase()}.`);
    } catch (error) {
      setMessage(error instanceof Error ? `Export failed: ${cleanErrorText(error.message)}` : "Export failed.");
    } finally {
      setBusy(null);
    }
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
    const cleanItems = sanitizeBoqItems(snapshot.items);
    const cleanItemIds = new Set(cleanItems.map((item) => item.id));
    const cleanCosted = snapshot.costed.filter((row) => cleanItemIds.has(row.item.id) && !isCommercialBoqItem(row.item));
    setProjectName(snapshot.projectName);
    setClientName(snapshot.clientName);
    setImports(snapshot.imports);
    setItems(cleanItems);
    setCosted(cleanCosted);
    setPiItems(snapshot.piItems ?? []);
    setSelectedItemId(cleanItems[0]?.id ?? null);
    setMessage(snapshot.message || "Restored saved workspace.");
    setLastSaved(snapshot.savedAt);
  }

  const exportControls = (
    <div className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-ink bg-ink p-4 text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Recommended</div>
          <div className="mt-2 text-lg font-semibold">Client quotation</div>
          <div className="mt-1 text-sm text-slate-300">Shareable price document for the client.</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <ExportFormatButton label="PDF" disabled={!costed.length} busy={busy === "client-quotation-pdf"} tone="light" onClick={() => exportFile("client-quotation", "pdf")} />
            <ExportFormatButton label="XLSX" disabled={!costed.length} busy={busy === "client-quotation-xlsx"} tone="light" onClick={() => exportFile("client-quotation", "xlsx")} />
            <ExportFormatButton label="CSV" disabled={!costed.length} busy={busy === "client-quotation-csv"} tone="light" onClick={() => exportFile("client-quotation", "csv")} />
          </div>
        </div>

        <div className="grid gap-3">
          <CompactExportCard title="PI" text={piItems.length ? `${piItems.length} PI rows ready` : "Push costed BOQ rows to PI first."}>
            <ExportFormatButton label="PDF" disabled={!piItems.length && !costed.length} busy={busy === "pi-pdf"} onClick={() => exportFile("pi", "pdf")} />
            <ExportFormatButton label="XLSX" disabled={!piItems.length && !costed.length} busy={busy === "pi-xlsx"} onClick={() => exportFile("pi", "xlsx")} />
          </CompactExportCard>
          <CompactExportCard title="Internal costing" text="Detailed raw, factory, margin, and material breakdown.">
            <ExportFormatButton label="PDF" disabled={!costed.length} busy={busy === "internal-costing-pdf"} onClick={() => exportFile("internal-costing", "pdf")} />
            <ExportFormatButton label="XLSX" disabled={!costed.length} busy={busy === "internal-costing-xlsx"} onClick={() => exportFile("internal-costing", "xlsx")} />
          </CompactExportCard>
        </div>
      </div>

      <details className="rounded-md border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Advanced exports and recovery</summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="grid gap-2 rounded-md bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">PDF extraction</div>
            <UploadButton label="Extract Spec Book" busy={busy === "spec-pdf"} accept=".pdf" onFile={(file) => uploadSpecPdf(file, "spec-book")} />
            <UploadButton label="Extract PI PDF" busy={busy === "pi-pdf"} accept=".pdf" onFile={(file) => uploadSpecPdf(file, "pi")} />
          </div>
          <div className="grid gap-2 rounded-md bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">Snapshot</div>
            <button onClick={exportSnapshot} className="btn-secondary">Save snapshot</button>
            <UploadButton label="Load snapshot" busy={busy === "snapshot"} accept=".json" onFile={importSnapshot} />
            <button onClick={clearSavedWorkspace} className="btn-secondary">
              <Trash2 size={15} />
              Clear saved workspace
            </button>
          </div>
          <ExportHistory jobs={exportJobs} />
        </div>
      </details>
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
        ["pi", "PI"],
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
        <>
          {pendingBoqReview && (
            <BoqMappingReview
              review={pendingBoqReview}
              busy={busy}
              onMappingChange={updateBoqMapping}
              onEnrich={enrichPendingBoq}
              onProcess={processPendingBoq}
              onCancel={() => {
                setPendingBoqReview(null);
                setMessage("BOQ review cancelled.");
              }}
            />
          )}
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
        </>
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

      {activeView === "pi" && (
        <PiWorkspace
          items={piItems}
          busy={busy}
          canPush={Boolean(costed.length)}
          onPush={pushCostedToPi}
          onAdd={addPiItem}
          onUpdate={updatePiItem}
          onRemove={removePiItem}
          onExport={exportFile}
        />
      )}

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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="surface overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">BOQ Workspace</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Upload, extract, cost</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">{message}</p>
              </div>
              <button onClick={() => setActiveView("pi")} className="btn-secondary">
                <FileUp size={15} />
                PI workspace
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Project" value={projectName} onChange={setProjectName} />
              <TextInput label="Client" value={clientName} onChange={setClientName} />
            </div>

            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
              <UploadButton label="Upload BOQ" busy={busy === "boq"} accept=".csv,.xlsx,.xls" onFile={uploadBoq} />
              <UploadButton label="Extract BOQ PDF" busy={busy === "pdf"} accept=".pdf" onFile={uploadBoqPdf} />
            </div>

            <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[160px_1fr_1fr] md:items-end">
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Margin
                <select value={globalMargin} onChange={(event) => setGlobalMargin(Number(event.target.value))} className="field">
                  {[0, 20, 25, 30, 35, 40, 45, 50].map((margin) => (
                    <option key={margin} value={margin}>
                      {margin}%
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" disabled={!items.length || busy === "margin"} onClick={applyGlobalMargin} className="btn-secondary disabled:text-slate-300">
                {busy === "margin" ? <Loader2 className="animate-spin" size={15} /> : <Percent size={15} />}
                Apply margin
              </button>
              <button type="button" disabled={!items.length || busy === "cost"} onClick={costAll} className="btn-primary disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none">
                {busy === "cost" ? <Loader2 className="animate-spin" size={16} /> : <Calculator size={16} />}
                Cost BOQ
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{items.length} BOQ rows · {costed.length} costed · {piItems.length} PI rows</span>
              <span>{lastSaved ? `Autosaved ${new Date(lastSaved).toLocaleString("en-IN")}` : "Autosave ready"}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <Metric label="Raw x Qty" value={totals.raw} />
          <Metric label="Factory x Qty" value={totals.factory} />
          <Metric label="Quotation Total" value={totals.sell} highlight />
        </div>
      </div>

      {tabs}
      {content}
    </section>
  );
}

function BoqMappingReview({
  review,
  busy,
  onMappingChange,
  onEnrich,
  onProcess,
  onCancel
}: {
  review: PendingBoqReview;
  busy: string | null;
  onMappingChange: (key: BoqColumnKey, header: string) => void;
  onEnrich: () => void;
  onProcess: () => void;
  onCancel: () => void;
}) {
  const canProcess = Boolean(review.mapping.name || review.mapping.spec) && Boolean(review.mapping.qty || review.rows.length);
  const fields: Array<{ key: BoqColumnKey; label: string; required?: boolean }> = [
    { key: "code", label: "Code" },
    { key: "name", label: "Product Name", required: true },
    { key: "dims", label: "Dimensions" },
    { key: "qty", label: "Qty", required: true },
    { key: "spec", label: "Original Spec" },
    { key: "aiSpec", label: "AI Enriched Spec" },
    { key: "ct", label: "Construction Type" },
    { key: "rawMat", label: "Raw Material" },
    { key: "dimsSource", label: "Dims Source" },
    { key: "image", label: "Image" }
  ];
  const previewHeaders = review.headers.slice(0, 8);
  return (
    <div className="surface overflow-hidden border-emerald-200">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Review BOQ Mapping</div>
          <h2 className="mt-1 text-base font-semibold text-ink">{review.sourceName}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {review.rows.length} rows from {review.sourceType === "pdf-vision" ? "PDF vision" : review.sourceType === "pdf-text" ? "PDF text fallback" : "workbook"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={!review.pageImages?.length || busy === "boq-enrich"} onClick={onEnrich} className="btn-secondary disabled:text-slate-300">
            {busy === "boq-enrich" ? <Loader2 className="animate-spin" size={15} /> : <Library size={15} />}
            AI enrich specs
          </button>
          <button disabled={!canProcess} onClick={onProcess} className="btn-primary disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none">
            Process BOQ
          </button>
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {fields.map((field) => (
            <label key={field.key} className="grid gap-1 text-xs font-medium text-slate-600">
              {field.label}{field.required ? " *" : ""}
              <select value={review.mapping[field.key] ?? ""} onChange={(event) => onMappingChange(field.key, event.target.value)} className="field font-normal">
                <option value="">Skip</option>
                {review.headers.map((header) => (
                  <option key={`${field.key}:${header}`} value={header}>{header}</option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="table-head">
              <tr>
                {previewHeaders.map((header) => <th key={header} className="px-3 py-2 font-medium">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {review.rows.slice(0, 5).map((row, index) => (
                <tr key={index} className="border-t border-slate-100">
                  {previewHeaders.map((header) => (
                    <td key={`${index}:${header}`} className="max-w-[220px] truncate px-3 py-2 text-slate-600" title={String(row[header] ?? "")}>
                      {String(row[header] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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

function PiWorkspace({
  items,
  busy,
  canPush,
  onPush,
  onAdd,
  onUpdate,
  onRemove,
  onExport
}: {
  items: PiItem[];
  busy: string | null;
  canPush: boolean;
  onPush: () => void;
  onAdd: () => void;
  onUpdate: (itemId: string, patch: Partial<PiItem>) => void;
  onRemove: (itemId: string) => void;
  onExport: (kind: "pi", format: ExportFormat) => void;
}) {
  const subtotal = items.reduce((total, item) => total + item.qty * item.unitPrice, 0);
  return (
    <Panel title="Spec Book & PI" icon={<FileUp size={18} />}>
      <div className="mb-4 flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-ink">PI working table</div>
          <div className="mt-1 text-xs text-slate-500">Push costed BOQ rows here or extract a spec/PI PDF. Review unit prices before export.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={!canPush} onClick={onPush} className="btn-secondary disabled:text-slate-300">
            <FileUp size={15} />
            Push costed BOQ
          </button>
          <button onClick={onAdd} className="btn-secondary">
            Add row
          </button>
          <button disabled={!items.length || busy === "pi-xlsx"} onClick={() => onExport("pi", "xlsx")} className="btn-primary disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none">
            {busy === "pi-xlsx" ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}
            PI Excel
          </button>
          <button disabled={!items.length || busy === "pi-pdf"} onClick={() => onExport("pi", "pdf")} className="btn-primary disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none">
            {busy === "pi-pdf" ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}
            PI PDF
          </button>
        </div>
      </div>

      {items.length ? (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Dimensions</th>
                <th className="px-3 py-2 font-medium">Specification</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Unit Price</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                  <td className="px-3 py-2"><input value={item.code} onChange={(event) => onUpdate(item.id, { code: event.target.value })} className="field px-2 py-1" /></td>
                  <td className="px-3 py-2"><input value={item.name} onChange={(event) => onUpdate(item.id, { name: event.target.value })} className="field px-2 py-1" /></td>
                  <td className="px-3 py-2"><input value={item.dims} onChange={(event) => onUpdate(item.id, { dims: event.target.value })} className="field px-2 py-1" /></td>
                  <td className="px-3 py-2"><textarea value={item.spec} onChange={(event) => onUpdate(item.id, { spec: event.target.value })} rows={2} className="field px-2 py-1" /></td>
                  <td className="px-3 py-2"><input type="number" value={item.qty} onChange={(event) => onUpdate(item.id, { qty: Number(event.target.value) || 1 })} className="field w-20 px-2 py-1" /></td>
                  <td className="px-3 py-2"><input type="number" value={item.unitPrice} onChange={(event) => onUpdate(item.id, { unitPrice: Number(event.target.value) || 0 })} className="field w-28 px-2 py-1" /></td>
                  <td className="px-3 py-2 font-semibold text-ink">{format(item.qty * item.unitPrice)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => onRemove(item.id)} className="btn-secondary min-h-0 px-2 py-1 text-xs">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={6} className="px-3 py-3 text-right text-sm font-semibold text-ink">Subtotal</td>
                <td className="px-3 py-3 text-sm font-semibold text-ink">{format(subtotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <EmptyState title="No PI rows yet" text="Cost the BOQ and push it here, or extract a spec book / PI PDF from the Exports tab." />
      )}
    </Panel>
  );
}

function CompactExportCard({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="text-sm font-semibold text-ink">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{text}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {children}
      </div>
    </div>
  );
}

function ExportFormatButton({ label, disabled, busy, tone = "default", onClick }: { label: string; disabled: boolean; busy: boolean; tone?: "default" | "light"; onClick: () => void }) {
  const classes = tone === "light"
    ? "border-white/30 bg-white text-ink hover:bg-slate-100 disabled:bg-white/40 disabled:text-slate-500"
    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:text-slate-300";
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase ${classes}`}
    >
      {busy ? <Loader2 className="animate-spin" size={13} /> : <Download size={13} />}
      {label}
    </button>
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
  if (!response.ok) throw new Error(cleanErrorText(await response.text()));
  return (await response.json()) as T;
}

async function readBoqRowsForMapping(file: File): Promise<Record<string, unknown>[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return rowsFromBoqCsv(await file.text());
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return rowsFromBoqWorkbook(new Uint8Array(await file.arrayBuffer()));
  throw new Error("Supported BOQ formats are CSV, XLSX, and XLS.");
}

async function renderPdfPageImages(file: File): Promise<PdfPageImage[]> {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: PdfPageImage[] = [];
  const maxPages = Math.min(pdf.numPages, 4);
  for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const viewport = page.getViewport({ scale: 0.9 });
    const canvas = document.createElement("canvas");
    const maxWidth = 1100;
    const shrink = viewport.width > maxWidth ? maxWidth / viewport.width : 1;
    canvas.width = Math.floor(viewport.width * shrink);
    canvas.height = Math.floor(viewport.height * shrink);
    const context = canvas.getContext("2d");
    if (!context) continue;
    await page.render({ canvasContext: context, viewport: page.getViewport({ scale: 0.9 * shrink }) }).promise;
    pages.push({ page: pageNo, base64: canvas.toDataURL("image/jpeg", 0.52).split(",")[1] ?? "", mimeType: "image/jpeg" });
  }
  if (!pages.length) throw new Error("Could not render PDF pages for vision extraction.");
  return pages;
}

async function loadPdfJs(): Promise<PdfJsLib> {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-kf-pdfjs]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("PDF.js failed to load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.dataset.kfPdfjs = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PDF.js failed to load. Check internet access and try again."));
    document.head.appendChild(script);
  });
  const pdfjsLib = window.pdfjsLib as PdfJsLib | undefined;
  if (!pdfjsLib) throw new Error("PDF.js is unavailable.");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return pdfjsLib;
}

function collectHeaders(rows: Record<string, unknown>[]): string[] {
  const headers = new Set<string>();
  rows.slice(0, 25).forEach((row) => Object.keys(row).forEach((key) => headers.add(key)));
  return Array.from(headers);
}

function detectBoqMapping(headers: string[], previous?: Partial<BoqColumnMapping>): BoqColumnMapping {
  const pick = (patterns: RegExp[]) => previous && previousValueExists(headers, previous, patterns) ? previousValueExists(headers, previous, patterns) : headers.find((header) => patterns.some((pattern) => pattern.test(normalizeHeaderText(header)))) ?? "";
  return {
    code: pick([/^code$/, /^sr$/, /item.*code/, /^sr.*no/]),
    name: pick([/product.*name/, /item.*name/, /^name$/, /^product$/, /^item$/, /description/, /particulars/]),
    dims: pick([/dimension/, /^size$/, /size.*mm/, /lxwxh/, /w.*d.*h/]),
    qty: pick([/^qty$/, /quantity/, /^nos$/, /pieces/, /count/]),
    spec: pick([/^specification$/, /original.*spec/, /^spec$/, /material.*spec/, /finish/, /details/, /remarks/]),
    aiSpec: pick([/ai.*enriched/, /enriched.*spec/, /ai.*spec/]),
    ct: pick([/construction/, /^ct$/, /frame.*type/, /material.*type/]),
    rawMat: pick([/raw.*material/, /^material$/, /^materials$/, /base.*material/]),
    image: pick([/^image$/, /thumbnail/, /photo/]),
    dimsSource: pick([/dims.*source/, /dim.*source/])
  };
}

function previousValueExists(headers: string[], previous: Partial<BoqColumnMapping>, patterns: RegExp[]): string {
  const match = Object.values(previous).find((value) => value && headers.includes(value) && patterns.some((pattern) => pattern.test(normalizeHeaderText(value))));
  return match ?? "";
}

function normalizeHeaderText(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function boqItemsFromMappedRows(rows: Record<string, unknown>[], mapping: BoqColumnMapping, margin: number): BoqItem[] {
  return rows.flatMap((row, index) => {
    const name = mappedValue(row, mapping.name);
    const spec = mappedValue(row, mapping.spec);
    const aiSpec = mappedValue(row, mapping.aiSpec);
    const rawMat = mappedValue(row, mapping.rawMat);
    const dims = mappedValue(row, mapping.dims);
    const qty = numericInput(mappedValue(row, mapping.qty)) || 1;
    const code = mappedValue(row, mapping.code);
    if (!name && !spec) return [];
    const combinedSpec = [spec, aiSpec, rawMat].filter(Boolean).join(" | ");
    const ct = mappedValue(row, mapping.ct) || inferCTFromSpec(name || spec, combinedSpec);
    const item: BoqItem = {
      id: `boq_${Date.now()}_${index}`,
      code: code || undefined,
      name: name || nameFromMappedSpec(spec) || code || `BOQ Item ${index + 1}`,
      ptype: classify(name || spec, dims, [combinedSpec, ct].filter(Boolean).join(" | ")),
      ct,
      dims,
      qty,
      margin,
      spec,
      aiSpec: aiSpec || undefined,
      image: mappedValue(row, mapping.image) || undefined,
      dimsSource: mappedValue(row, mapping.dimsSource) || undefined
    };
    return [item];
  });
}

function mappedValue(row: Record<string, unknown>, header: string): string {
  return header ? String(row[header] ?? "").trim() : "";
}

function nameFromMappedSpec(spec: string): string {
  return spec.replace(/\s+/g, " ").split(/\b(?:made|using|having|with|to be)\b/i)[0]?.trim().slice(0, 90) ?? "";
}

function rowsFromBoqItems(items: BoqItem[]): Record<string, unknown>[] {
  return items.map((item) => ({
    Code: item.code ?? "",
    "Product Name": item.name,
    Dimensions: item.dims,
    Specification: item.spec ?? "",
    "AI Enriched Spec": item.aiSpec ?? "",
    Qty: item.qty,
    "Construction Type": item.ct ?? "",
    Image: item.image ?? "",
    "Dims Source": item.dimsSource ?? ""
  }));
}

function mergeBoqEnrichments(rows: Record<string, unknown>[], enrichments: unknown[]): Record<string, unknown>[] {
  const next = rows.map((row) => ({ ...row }));
  enrichments.forEach((entry) => {
    const value = entry as Record<string, unknown>;
    const index = Math.max(0, numericInput(value.row) - 1);
    if (!next[index]) return;
    if (value.missing_spec) next[index]["AI Enriched Spec"] = [next[index]["AI Enriched Spec"], value.missing_spec].filter(Boolean).join(" | ");
    if (value.inferred_ct) next[index]["Construction Type"] = value.inferred_ct;
    if (value.inferred_dims && !String(next[index].Dimensions ?? "").trim()) next[index].Dimensions = value.inferred_dims;
    if (value.dims_source) next[index]["Dims Source"] = value.dims_source;
    if (value.image_bbox) next[index]["Image BBox"] = value.image_bbox;
  });
  return next;
}

async function attachVisionImages(rows: Record<string, unknown>[], pageImages: PdfPageImage[]): Promise<Record<string, unknown>[]> {
  const next = rows.map((row) => ({ ...row }));
  await Promise.all(next.map(async (row) => {
    const bbox = parseImageBbox(row["Image BBox"] ?? row.image_bbox ?? row.bbox);
    if (!bbox) return;
    const page = pageImages.find((image) => image.page === bbox.page) ?? pageImages[0];
    if (!page) return;
    try {
      row.Image = await cropPdfImage(page, bbox);
    } catch {
      // Thumbnails are helpful, but extraction should continue without them.
    }
  }));
  return next;
}

function parseImageBbox(value: unknown): { page: number; x: number; y: number; w: number; h: number } | undefined {
  if (!value) return undefined;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const bbox = parsed as { page?: unknown; x?: unknown; y?: unknown; w?: unknown; h?: unknown };
    const x = numericInput(bbox.x);
    const y = numericInput(bbox.y);
    const w = numericInput(bbox.w);
    const h = numericInput(bbox.h);
    if (w <= 0 || h <= 0) return undefined;
    return { page: numericInput(bbox.page) || 1, x, y, w, h };
  } catch {
    return undefined;
  }
}

function cropPdfImage(page: PdfPageImage, bbox: { x: number; y: number; w: number; h: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const sx = Math.max(0, (bbox.x / 100) * image.width);
      const sy = Math.max(0, (bbox.y / 100) * image.height);
      const sw = Math.min(image.width - sx, (bbox.w / 100) * image.width);
      const sh = Math.min(image.height - sy, (bbox.h / 100) * image.height);
      const canvas = document.createElement("canvas");
      const scale = Math.min(140 / Math.max(sw, 1), 140 / Math.max(sh, 1), 1);
      canvas.width = Math.max(1, Math.round(sw * scale));
      canvas.height = Math.max(1, Math.round(sh * scale));
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("Canvas is unavailable."));
      context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => reject(new Error("Could not load rendered page image."));
    image.src = `data:${page.mimeType};base64,${page.base64}`;
  });
}

async function fetchJsonWithTimeout<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? ((await response.json()) as T & { error?: string })
      : ({ error: await response.text() } as T & { error?: string });
    if (!response.ok) throw new Error(cleanErrorText(body.error ?? "Request failed."));
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
  piItems: PiItem[];
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
    piItems: input.piItems,
    message: input.message
  };
}

function normalizeSnapshot(raw: unknown): WorkspaceSnapshot {
  const input = raw as Partial<WorkspaceSnapshot> & { version?: number; imports?: Partial<ImportState> & { vendors?: VendorLink[] | number } };
  if (!input.imports || !Array.isArray(input.items) || !Array.isArray(input.costed)) throw new Error("Invalid snapshot file.");
  const vendors = Array.isArray(input.imports.vendors) ? input.imports.vendors : [];
  const items = sanitizeBoqItems(input.items);
  const itemIds = new Set(items.map((item) => item.id));
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
    items,
    costed: input.costed.filter((row) => itemIds.has(row.item.id) && !isCommercialBoqItem(row.item)),
    piItems: Array.isArray(input.piItems) ? input.piItems : [],
    message: input.message ?? "Restored saved workspace."
  };
}

function piItemsFromExtractedSections(sections: ExtractedSpecRow[], source: PiItem["source"]): PiItem[] {
  return sections.flatMap((section, index) => {
    const name = String(section.itemName ?? "").trim();
    const spec = [section.specification, section.finish].filter(Boolean).join(" | ").trim();
    if (!name && !spec) return [];
    const qty = numericInput(section.quantity) || 1;
    const amount = numericInput(section.amount);
    return [{
      id: `pi_extract_${Date.now()}_${index}`,
      code: String(section.itemCode ?? "").trim(),
      name: name || spec.slice(0, 80) || `Item ${index + 1}`,
      dims: String(section.dimensions ?? "").trim(),
      spec,
      qty,
      unitPrice: amount && qty ? Math.round(amount / qty) : 0,
      source
    }];
  });
}

function piItemsToCostedRows(items: PiItem[]): CostedRow[] {
  return items.map((piItem, index) => {
    const qty = piItem.qty || 1;
    const unitPrice = piItem.unitPrice || 0;
    const item: BoqItem = {
      id: piItem.id,
      code: piItem.code,
      name: piItem.name || `Item ${index + 1}`,
      ptype: "UNKNOWN",
      dims: piItem.dims,
      qty,
      margin: 0,
      spec: piItem.spec
    };
    return {
      item,
      result: {
        raw: 0,
        factory: unitPrice,
        sell: unitPrice,
        total: Math.round(unitPrice * qty),
        confidence: 1,
        source: piItem.source,
        breakdown: [],
        refs: [],
        matchLevel: "catalog",
        matchLabel: piItem.source === "boq" ? "Pushed from costed BOQ" : "PI table",
        matchScore: 1
      }
    };
  });
}

function numericInput(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return Number(String(value ?? "").replace(/,/g, "").replace(/[^0-9.-]/g, "")) || 0;
}

function cleanErrorText(value: string): string {
  try {
    const parsed = JSON.parse(value) as { error?: string };
    return parsed.error || value;
  } catch {
    return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
  }
}

function sanitizeBoqItems(items: BoqItem[]): BoqItem[] {
  return items.filter((item) => !isCommercialBoqItem(item));
}

function isCommercialBoqItem(item: BoqItem): boolean {
  const code = (item.code ?? "").trim();
  const name = item.name.trim();
  const label = `${item.name} ${item.dims ?? ""} ${item.spec ?? ""}`.replace(/\s+/g, " ").trim().toLowerCase();
  const productCode = /^([a-z]{1,4}\s*-?\s*\d+[a-z]?|\d+)$/i.test(code);

  if (productCode) return false;

  if (!item.dims?.trim() && !item.spec?.trim() && (!name || /^boq item \d+$/i.test(name) || /^[a-z]$/i.test(name) || /^[`'"’‘]+$/.test(name))) {
    return true;
  }

  return [
    /\btransportation\b/,
    /\bhandling charges?\b/,
    /\binstallation charges?\b/,
    /\btotal\b/,
    /\bpackaging\b/,
    /\ba\s*\+\s*b\b/,
    /\bgst\b/,
    /\bpayment terms?\b/,
    /\btat\b/,
    /\bwarranty\b/,
    /\bfabric\b/,
    /\bpenalty\b/,
    /\bterms?\s*&?\s*conditions?\b/
  ].some((pattern) => pattern.test(label));
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  downloadBrowserBlob(blob, filename);
}

function downloadBrowserBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filenameFromResponse(response: Response, fallback: string): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
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
