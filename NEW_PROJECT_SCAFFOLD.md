# Kian Falcon Costing Intelligence - New Project Scaffold Brief

This document was created after reading the full repository. The current app is a powerful single-file prototype, but it is not production-hostable or scalable in its present form because it relies on a 500 KB+ `index.html`, browser `localStorage`, client-side API keys, CDN scripts, and direct browser calls to AI providers.

Use this as the handoff brief for rebuilding the product as a clean, scalable application.

## Repository Inventory

| Path | Role | Keep / Migrate |
| --- | --- | --- |
| `index.html` | Entire application: HTML, CSS, UI state, training parser, costing engine, PDF parsing, AI prompts, exports, vendor/project/spec-book features. | Migrate logic into typed modules, move secrets and AI calls to backend, split UI into components. |
| `README.md` | Current local setup and backup instructions. | Replace after rebuild with modern setup, deployment, and data import docs. |
| `CLAUDE.md` | Existing project knowledge file with important globals, data flow, and known bugs. | Preserve as migration notes; merge key warnings into engineering docs/tests. |
| `kf_backup_scripts.js` | Browser console backup/restore scripts for `kf_v7_` localStorage data. | Replace with real export/import endpoints and database backups. |
| `livereload_server.py` | Minimal local static server with HTML live-reload injection. | Replace with framework dev server. |
| `serve.sh` | Starts `livereload_server.py` on port 8080. | Drop after framework scaffold. |
| `config.local.js.example` | Example local API key file: `window.KF_API_KEY = 'sk-ant-...'`. | Do not use in production; replace with server env vars. |
| `.gitignore` | Ignores Claude settings, Excel temp files, and local config. | Expand for new stack (`node_modules`, `.env`, build output, uploads, cache). |
| `.claude/settings.local.json` | Local Claude Code permission settings. | Do not migrate into product code. |
| `training_data.xlsx` | Seed Master Costing workbook, sheet `Master Costing`, 2,644 rows, 13 columns. | Import into database through a seed/import script. |
| `training_data2.xlsx` | Current auto-loaded Master Costing workbook, sheet `Master Costing`, 2,702 rows, 14 columns including `Grand Total (INR)`. | Primary seed import candidate. |
| `rm_rates.xlsx` | Raw material/vendor rate workbook, sheet `Sheet1`, 928 rows, 9 columns. | Import into material rates and vendor tables. |
| `costa_golden_boq.csv` | Small sample BOQ with 7 rows for Costa items. | Keep as fixture/test data. |
| `server.out.log`, `server.err.log` | Empty logs. | Drop. |
| `changes/Screenshot 2026-05-22 160542.png` | UI change screenshot. | Keep only as design reference if useful. |

## Current Product Capabilities

The app is a furniture BOQ costing intelligence tool for Kian Falcon. It lets users upload or manually enter BOQ line items, classify product types, estimate raw material costs, apply factory overhead and margins, use AI for extraction/enrichment, manage rate/vendor data, save projects, and export quotations/spec-book documents.

Major screens:

- BOQ Workspace: upload `.xlsx`, `.xls`, `.csv`, or `.pdf`, map columns, cost items, edit dimensions/materials/rates, fetch AI rates, save project, export CSV.
- Training Data: upload Master Costing data and RM rate data; builds corpus, regression models, ratio norms, rates, and vendors.
- Rate Library: edit built-in and custom material rates.
- Dimension Models: inspect trained regression models.
- Settings: save Anthropic and OpenAI keys in browser storage.
- Vendor Directory: searchable vendor/material directory generated from RM rates plus manual contact edits.
- Projects: saved BOQ archive with summaries and CSV export.
- Spec Book & PI: upload furniture/spec PDF, extract rows with Claude Vision, generate PI Excel/CSV/PDF.
- Export Center: client quotation CSV and internal costing CSV.

## Current Runtime Architecture

The whole app runs in the browser from `index.html`.

External scripts loaded from CDNs:

- Sheet parsing: `xlsx`
- PDF rendering/text extraction: `pdf.js`
- PDF generation: `jspdf`
- PDF tables: `jspdf-autotable`
- Fonts from Google Fonts

Local boot flow:

1. `DOMContentLoaded` runs initialization.
2. `loadCorpus()` reads `kf_v7_` keys from localStorage.
3. If configured files are missing from localStorage, auto-loads:
   - `training_data2.xlsx`
   - `rm_rates.xlsx`
4. Parses training/rate workbooks in browser.
5. Builds or refreshes models.
6. Initializes drag/drop zones and renders UI.

Current static serving:

- `./serve.sh` starts `python3 livereload_server.py`.
- Server serves files from repo root on `http://localhost:8080`.
- Server injects a polling script into the first `</body>` for live reload.

## Important Current Data Schemas

### Master Costing Workbook

`training_data2.xlsx` is the current auto-load file.

Expected columns:

```text
Brand
Item No.
Product Name
Product Size (mm)
Construction Type
Section
Raw Material / Finish
Category
Unit
Qty
Rate (INR)
Amount (INR)
Grand Total (INR)
Data Quality
```

Older schema in `training_data.xlsx` lacks `Grand Total (INR)` but otherwise matches the same product/material concept.

Rows with `Data Quality` containing `OUTLIER` or `UNIT ERROR` are skipped.

Product grouping:

- Primary key is `Brand + Item No.` when item number exists.
- Fallback key is `Brand + Product Name + Size`.

Derived corpus product fields:

```ts
type CorpusProduct = {
  brand: string;
  product: string;
  itemno?: string;
  size: string;
  ptype: ProductType;
  ct: string;
  L: number;
  W?: number;
  H?: number;
  area: number;
  uph_area: number;
  _total: number;
  sourceFile: string;
  ply_sft?: number;
  foam_sft?: number;
  uph_mtr?: number;
  uph_sft?: number;
  metal_kg?: number;
  wood_cft?: number;
  wood_teak_cft?: number;
  wood_beech_cft?: number;
  wood_marandi_cft?: number;
  compact_sft?: number;
  veneer_sft?: number;
  lam_sft?: number;
  bal_sft?: number;
  polish_sft?: number;
  edge_mtr?: number;
  fevicol_sft?: number;
};
```

### RM Rates Workbook

`rm_rates.xlsx` expected columns:

```text
party name
Name
UOM
QTY
RATE
TOTAL
```

The parser:

- Converts sheet/NOS panel rates to SFT for plywood, MDF, HDHMR, laminate, and solid surface.
- Normalizes units such as `SQFT -> SFT`, `KGS -> KGS`, `RMT -> MTR`.
- Skips non-furniture, logistics, food, packaging, electrical, and irrelevant supplies.
- Matches material names to internal rate keys via ordered string patterns.
- Uses median rate where multiple matches exist.
- Fills missing rates from embedded fallback constants.

### BOQ Input

The BOQ mapper expects user-configurable columns. Common target fields:

```text
Sr / code
Product Name
Original Specification
AI Enriched Specification
Dimensions
Qty
```

`costa_golden_boq.csv` sample schema:

```text
Code, Product Name, Dimensions, Specification, Qty
```

### localStorage Keys

Current prefix: `kf_v7_`

Known keys:

- `kf_v7_corpus`
- `kf_v7_models`
- `kf_v7_meta`
- `kf_v7_rates`
- `kf_v7_vendors`
- `kf_v7_claude_cache`
- `kf_v7_projects`
- `kf_v7_c_{id}` per-line correction records
- `kf_v7_apikey` legacy key
- `kf_v7_anthropic_key` or equivalent current Anthropic key store in code
- OpenAI key store constant in code

The app has a soft localStorage guardrail of about 5,000 KB.

## Core Domain Model To Rebuild

### Product Types

Current product type ids:

```text
CHAIR
CHAIR_WOOD
CHAIR_RATTAN
CHAIR_AL
CHAIR_MS
STOOL
STOOL_OUT
TABLE
TABLE_WOOD
SOFA
SOFA_LEATH
SOFA_LAM
COUNTER
UNKNOWN
COMPACT_BOARD
```

Each product type has:

- Display label.
- Regression bucket (`CHAIR`, `STOOL`, `TABLE`, `SOFA`, or none).
- Confidence base.
- Optional warning flags.
- Material map in `MATMAP`.

### Rate Item

```ts
type RateItem = {
  key: string;
  label: string;
  rate: number;
  unit: 'SFT' | 'CFT' | 'KG' | 'KGS' | 'MTR' | 'NOS' | 'PCS' | 'SET' | 'PKT' | string;
  category: string;
  source: string;
  custom?: boolean;
};
```

### BOQ Item

```ts
type BoqItem = {
  id: string;
  code?: string;
  name: string;
  ptype: ProductType;
  ct?: string;
  dims: string;
  qty: number;
  margin: number;
  spec?: string;
  aiSpec?: string;
  rawOverride?: number;
  manualFac?: number;
  notes?: string;
  reason?: string;
  fabricRate?: number;
  fabricMtr?: number;
  metalFinish?: string;
  claudeMats?: AiMaterial[];
  qtyOverrides?: Record<string, number>;
  rateOverrides?: Record<string, number>;
  materialOverrides?: Record<string, string>;
  addedMaterials?: AddedMaterial[];
};
```

### Cost Result

```ts
type CostResult = {
  raw: number;
  factory: number;
  sell: number;
  total: number;
  confidence: number;
  source: 'trained' | 'dataset' | 'interpolated' | 'seed' | 'spec+est' | 'claude' | 'gpt4o' | string;
  breakdown: MaterialBreakdownLine[];
  refs: CorpusReference[];
  matchLevel: 'catalog' | 'similar' | 'new';
  matchLabel: string;
  matchScore: number;
};
```

Costing formulas:

```text
Raw Material Cost = sum(material qty * material rate)
Factory Cost = Raw Material Cost * 1.65
Selling Price = Factory Cost / (1 - margin%)
Line Total = Selling Price * BOQ Qty
Variance % = (AI Factory - Manual Factory) / Manual Factory * 100
Amber variance = |variance| > 20%
Red variance = |variance| > 30%
```

## Costing Engine Behavior To Preserve

The current engine is a hybrid estimator, not a single ML model.

Quantity derivation priority:

1. User override.
2. Fixed material quantity.
3. Geometry formula.
4. Table/table-wood spec-driven estimator.
5. Scaled reference product from corpus.
6. Regression model from current corpus.
7. Seed fallback regression.
8. Ratio norm fallback.

Regression notes:

- CT-specific models are built first when a construction type has at least 3 products.
- Product bucket models are built for `CHAIR`, `STOOL`, `TABLE`, and `SOFA`.
- Most current model predictors use plan area.
- Critical rule from existing docs: when `useArea=true`, predictor must be `planArea`, not raw length in mm.

Reference matching:

- Uses product type match, construction-type token similarity, and plan area proximity.
- Uses `ctScore()` with synonym expansion for wood species, plywood, upholstery, metal, finish, stone, and substrate terms.
- Similar historical items become calibration anchors for AI prompts and drawer explanation.

Material map:

- `MATMAP` maps variables like `ply_sft`, `foam_sft`, `uph_mtr`, `metal_kg`, `wood_cft`, `edge_mtr`, etc. to one or more rate keys and split fractions.
- Some product types suppress or alter materials based on spec flags, e.g. stone tops suppress table board top lines, solid wood tops use slab logic, species-specific wood keys only fire when that species is detected.

Classification:

- `classify()` inspects product name, dimensions, and spec.
- `inferCTFromSpec()` creates normalized construction types from materials/spec text.
- `ptypeFromCT()` exists in two places in the current file with different behavior; rebuild should consolidate this into one tested classifier.

Known bugs never to reintroduce:

- In `aiCompute`, initialize `let ptype = item.ptype` before any ptype use.
- For regression with `useArea=true`, use `planArea`, not raw `L`.
- `parseTrainingFile` should call `ptypeFromCT(...)`, not `item.ptypeFromCT(...)`.
- `CHAIR_WOOD` material map must include `uph_mtr` mapped to `fabric_mid`.

Also investigate during rebuild:

- Current `inferCTFromSpec()` references `body.push(...)`, but no local `body` variable is visible in the function. This should be fixed or removed.
- `PTYP` currently appears to contain misplaced `thread_set` and `piping_mtr` keys near `SOFA_LAM`. Rebuild with strict typing to catch this.
- `index.html` ends with duplicated `</body></html>` tags.
- README/CLAUDE text appears mojibake-encoded in places; normalize encoding to UTF-8.

## AI Features To Preserve, But Move Server-Side

Current AI usage:

- Anthropic Claude Vision for BOQ PDF table extraction.
- Anthropic Claude Vision for spec-book/layout extraction.
- Anthropic Claude Sonnet for per-item material costing.
- OpenAI GPT-4o for alternate per-item material costing.
- Prompt includes live rate list and top corpus anchors.

Current models referenced in code:

- `claude-opus-4-5` for PDF/spec extraction.
- `claude-sonnet-4-20250514` for per-item AI costing.
- `gpt-4o` via OpenAI Responses API.

Production requirement:

- Never store provider API keys in the browser.
- Never call Anthropic/OpenAI directly from the browser.
- Create backend endpoints such as:
  - `POST /api/ai/extract-boq-pdf`
  - `POST /api/ai/extract-specbook`
  - `POST /api/ai/cost-item`
  - `POST /api/ai/cost-boq-bulk`
- Use server env vars and per-user/org permission checks.
- Store AI request/response audit logs with prompt version and model id.
- Cache AI costing results by normalized item signature, CT, dimensions, rates version, and prompt version.

## Recommended New Architecture

Suggested stack:

- Frontend: Next.js + React + TypeScript.
- UI: Tailwind or CSS modules plus a component system.
- Backend: Next.js route handlers, or separate FastAPI/NestJS if preferred.
- Database: PostgreSQL.
- ORM: Prisma, Drizzle, or SQLAlchemy if using Python.
- File storage: S3-compatible object storage for uploaded PDFs/XLSX and generated documents.
- Jobs: background worker for large PDF parsing, training import, and bulk AI costing.
- Auth: organization-aware users and roles.
- Tests: unit tests for parsers/cost engine, fixtures for BOQ and workbook import, integration tests for import/cost/export workflows.

Recommended top-level structure:

```text
apps/
  web/
    app/
    components/
    features/
      boq/
      training/
      rates/
      vendors/
      projects/
      specbook/
      settings/
    lib/
packages/
  costing-engine/
    src/
      classify.ts
      dimensions.ts
      materials.ts
      cost.ts
      regression.ts
      corpus.ts
      prompts.ts
    tests/
  importers/
    src/
      master-costing.ts
      rm-rates.ts
      boq.ts
      pdf.ts
  shared/
    src/
      types.ts
      units.ts
server/
  jobs/
  storage/
  ai/
docs/
  product-requirements.md
  data-contracts.md
  migration-plan.md
```

## Suggested Database Tables

Core:

- `organizations`
- `users`
- `projects`
- `boqs`
- `boq_items`
- `boq_item_corrections`
- `saved_projects`

Training:

- `training_sources`
- `corpus_products`
- `corpus_material_quantities`
- `trained_models`
- `ratio_norms`

Rates and vendors:

- `rate_categories`
- `rate_items`
- `rate_versions`
- `vendors`
- `vendor_materials`
- `vendor_contacts`

Files and AI:

- `uploaded_files`
- `pdf_pages`
- `ai_requests`
- `ai_results`
- `ai_cache_entries`

Exports:

- `export_jobs`
- `generated_documents`

## Critical Backend Services

### Import Service

Responsibilities:

- Parse Master Costing workbook.
- Parse RM rates workbook.
- Validate headers, units, numeric fields, and skipped rows.
- Produce import summary: new products, duplicates, skipped/outlier rows, rates updated, vendors updated.
- Store original file and normalized records.

### Costing Engine Service

Make this pure and testable:

```ts
costItem({
  item,
  rates,
  corpus,
  models,
  ratioNorms,
  options
}) => CostResult
```

Do not let UI code, DOM state, or database calls leak into the engine.

### AI Service

Responsibilities:

- Build prompts from stable templates.
- Inject corpus anchors and rate list.
- Call provider APIs.
- Validate JSON output with schema.
- Normalize AI material lines into internal rate/material format.
- Cache outputs.
- Record audit trail.

### Export Service

Responsibilities:

- Client quotation CSV/XLSX/PDF.
- Internal costing CSV/XLSX.
- Spec book PI Excel/PDF.
- All exports should be reproducible from database snapshots.

## Migration Plan

1. Freeze current behavior with fixtures.
   - Use `costa_golden_boq.csv`.
   - Use representative rows from `training_data2.xlsx`.
   - Use representative rows from `rm_rates.xlsx`.
   - Save expected cost outputs for a few known items.

2. Extract pure logic from `index.html`.
   - Dimensions parser.
   - Classifier.
   - Training parser.
   - RM parser.
   - Regression builder.
   - Material map and cost engine.
   - Export row builders.

3. Create typed data contracts.
   - Replace ad hoc objects with TypeScript interfaces.
   - Add schema validation with Zod or similar.

4. Build database importers.
   - Seed `rate_items` from `BASE_RATES`.
   - Import `training_data2.xlsx` into `corpus_products`.
   - Import `rm_rates.xlsx` into rates/vendors.

5. Rebuild BOQ workflow.
   - Upload file.
   - Map columns.
   - Process items server-side.
   - Render editable costing table.
   - Persist corrections immediately.

6. Rebuild AI workflow.
   - Server routes only.
   - Schema-validated output.
   - Job progress for bulk costing and PDF extraction.

7. Rebuild exports.
   - First CSV/XLSX.
   - Then PDF PI.

8. Add auth, roles, and deployment.
   - Org-level data isolation.
   - Environment-managed secrets.
   - Hosted database and object storage.

## Minimum Test Suite For New Project

Parser tests:

- `parseDims()` handles `590x580x830`, `DIA 600 x 750`, `W450 D550 H870`, and imperial dimensions.
- Master Costing parser groups products correctly and skips outliers.
- RM parser converts sheet/NOS to SFT correctly.
- CSV BOQ parser handles `costa_golden_boq.csv`.

Costing tests:

- `CHAIR` with ashwood spec upgrades to `CHAIR_WOOD`.
- `TABLE` with marble/stone top suppresses laminate top variables and includes stone.
- `TABLE` with `DIA` uses circular area.
- `SOFA` applies sofa material maps and confidence logic.
- Regression with `useArea=true` uses plan area.
- Manual overrides win over generated estimates.

AI tests:

- Prompt builder includes rate list, item details, and nearest anchors.
- AI JSON validator rejects malformed output.
- Provider failures return recoverable job errors.

Export tests:

- Client export excludes raw/factory/margin data.
- Internal export includes material breakdown and confidence/source.
- PI totals include GST modes correctly.

## What Not To Carry Forward

- Do not keep app state only in `localStorage`.
- Do not keep API keys in `config.local.js` or browser storage.
- Do not make direct browser calls to Anthropic/OpenAI.
- Do not keep the entire app in one HTML file.
- Do not depend on CDN scripts for core production behavior.
- Do not mutate global objects from UI event handlers.
- Do not build generated HTML strings for large UI surfaces.
- Do not rely on browser memory for large PDFs/workbooks.
- Do not leave rate/model versions implicit.

## First Scaffold Checklist

Use this as the first implementation milestone:

- Create TypeScript app with linting, formatting, and tests.
- Add database schema for orgs, files, rates, corpus, models, BOQs, vendors, projects.
- Implement `packages/costing-engine` with no DOM dependencies.
- Port `parseDims`, `classify`, `MATMAP`, `BASE_RATES`, `parseTrainingFile`, `parseRMFile`, `rebuildModelsFromCorpus`, and `costItem`.
- Add import CLI or admin page for `training_data2.xlsx` and `rm_rates.xlsx`.
- Add BOQ upload + column mapper.
- Persist BOQ items and corrections.
- Add server-side AI endpoints with env vars.
- Add exports after cost workflow is stable.

## Open Questions For Product Owner

- Should pricing be organization-specific, project-specific, or globally shared?
- Should users be able to version rate libraries and compare old vs new estimates?
- Should AI-generated material rates be allowed into the official rate library automatically, or require approval?
- Should historical `localStorage` backups be importable into the new database?
- Should vendors be contact-management only, or tied to procurement/quotes later?
- What is the required hosting target: Vercel, AWS, Azure, on-prem, or private VPS?

