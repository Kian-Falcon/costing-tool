# Feature Parity Status

This rebuild is no longer just a scaffold. It now implements the first usable slice of the old costing tool workflow.

## Implemented

- Real `training_data2.xlsx` Master Costing import.
- Real `rm_rates.xlsx` rate/vendor import with unit normalization and seed fallbacks.
- Real `costa_golden_boq.csv` BOQ import.
- BOQ upload route for CSV/XLS/XLSX.
- Master Costing and RM Rates multipart upload routes.
- Bulk BOQ costing route.
- Client quotation CSV export.
- Internal costing CSV export with material breakdown.
- Pure dimension parser, classifier, material map, cost formula, corpus references, area regression, and ratio norms.
- Dashboard workflow for importing training/rates, uploading BOQ, costing all rows, and exporting CSVs.

## Still Pending For Full Old-Tool Parity

- The original `index.html` source is not present in this workspace, so exact prompt text, all material rules, all UI states, and every edge-case behavior cannot be ported literally yet.
- PDF BOQ extraction and spec-book extraction routes are placeholders until provider integration is configured.
- Claude/OpenAI calls are intentionally server-side only and still need provider client implementations.
- Database persistence is modeled in Prisma but not wired to a running PostgreSQL instance.
- Auth, roles, file storage, background jobs, project archive UI, vendor editing UI, and PDF/XLSX export generation remain to be implemented.
