# Hosting Guide

This project is ready to host as a Next.js app with server API routes.

## Recommended Target: Vercel

The current feature slice does not require a database to run. Uploads are parsed in memory, costing is calculated on demand, and exports are generated as CSV responses.

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Create a new Vercel project and import the repository.
3. Keep the project root as the repository root. The root `vercel.json` handles the web app path.
4. Confirm these deployment settings:

```text
Framework Preset: Next.js
Install Command: npm install
Build Command: npm run build --workspace @kf/web
Output Directory: apps/web/.next
```

5. Deploy.

## Environment Variables

No environment variables are required for the current costing workflow.

Optional variables:

```text
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
DATABASE_URL=...
```

`ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are only needed once AI provider integration is enabled. `DATABASE_URL` is only needed once persistent projects, users, and stored rate libraries are wired into the app.

## Post-Deploy Check

Open the hosted app and test the dashboard workflow:

1. Upload `training_data2.xlsx` with the Master Costing importer.
2. Upload `rm_rates.xlsx` with the RM Rates importer.
3. Upload `costa_golden_boq.csv` or a BOQ workbook.
4. Run costing for all rows.
5. Export the client quotation CSV.
6. Export the internal costing CSV.

## Current Hosting Limits

- Uploaded files are processed in memory and are not persisted after refresh.
- Projects and costing sessions are not saved to a database yet.
- AI PDF extraction is a placeholder until a provider client is connected.
- Large PDFs or very large workbooks should later move to object storage plus background jobs.

## Self-Host Alternative

For a VPS or internal Windows/Linux server:

```bash
npm install
npm run build --workspace @kf/web
npm run start --workspace @kf/web
```

The production server starts on port `3000` by default. Put a reverse proxy such as Nginx, Caddy, or IIS in front of it for HTTPS and a custom domain.
