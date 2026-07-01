# Kian Falcon Costing Intelligence

Modern rebuild scaffold for the Kian Falcon furniture BOQ costing tool.

## Stack

- Next.js + React + TypeScript for the web app and API routes.
- PostgreSQL + Prisma for persistent projects, rates, corpus, vendors, files, and AI audit logs.
- Pure TypeScript packages for costing logic and importers.
- Vitest for parser, classifier, costing, and importer tests.

## Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Open the app at `http://localhost:3000`.

## Hosting

The app is prepared for Vercel deployment from the repository root. See `docs/hosting.md` for deploy settings, environment variables, and post-deploy checks.

## Current Feature Slice

- Import `training_data2.xlsx` through the Master Costing importer.
- Import `rm_rates.xlsx` through the RM Rates importer.
- Upload `costa_golden_boq.csv` or another BOQ CSV/XLSX.
- Cost all BOQ rows with seed rates, imported rates, corpus references, area models, and ratio norms.
- Export client quotation CSV and internal costing CSV.

See `docs/feature-parity-status.md` for what is implemented versus still pending from the old single-file tool.

The training workbooks currently present in the repo root are:

- `training_data.xlsx`
- `training_data2.xlsx`

The repo also includes `rm_rates.xlsx` and `costa_golden_boq.csv` as importer/export fixtures.

## Project Shape

```text
apps/web              Next.js app, server routes, UI shell
packages/shared      Shared domain contracts
packages/costing-engine Pure costing/classification/regression logic
packages/importers   Workbook and BOQ import normalization
server               Jobs, storage, and provider service boundaries
prisma               Database schema
docs                 Product, data, and migration notes
```

Provider API keys must stay in `.env` and only be used from server routes or server jobs.
