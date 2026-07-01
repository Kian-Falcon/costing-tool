# Migration Plan

1. Freeze behavior with fixtures from `training_data2.xlsx`, `rm_rates.xlsx`, and sample BOQ files.
2. Port the remaining single-file prototype logic into `packages/costing-engine`.
3. Replace browser `localStorage` state with PostgreSQL-backed projects, rates, corpus, vendors, and corrections.
4. Move all Anthropic and OpenAI calls behind server routes and jobs.
5. Add workbook and PDF upload storage through the object storage adapter.
6. Rebuild exports from database snapshots.
7. Add auth, roles, organization isolation, and deployment configuration.
