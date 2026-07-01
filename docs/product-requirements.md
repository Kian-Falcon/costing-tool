# Product Requirements

Kian Falcon Costing Intelligence supports furniture BOQ costing from uploaded spreadsheets, PDFs, and manually entered rows.

## Required Workflows

- Import Master Costing and RM rate workbooks.
- Upload BOQ files and map source columns to normalized fields.
- Classify product type and construction type.
- Estimate raw material cost, factory cost, selling price, and line total.
- Persist BOQ corrections immediately.
- Keep provider API keys server-side.
- Export client quotations and internal costing views from stored snapshots.

## First Milestone

- Keep `packages/costing-engine` pure and testable.
- Use database-backed rates, corpus, BOQs, projects, vendors, AI logs, and export jobs.
- Implement AI routes as server endpoints with prompt versioning and cache signatures.
