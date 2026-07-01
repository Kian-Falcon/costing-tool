# Data Contracts

The canonical TypeScript contracts live in `packages/shared/src/index.ts`.

## Master Costing

Required columns:

```text
Brand
Item No.
Product Name
Product Size (mm)
Construction Type
Raw Material / Finish
Amount (INR)
Grand Total (INR)
Data Quality
```

Rows marked `OUTLIER` or `UNIT ERROR` are skipped.

## RM Rates

Expected columns:

```text
party name
Name
UOM
QTY
RATE
TOTAL
```

Sheet, NOS, and PCS rates are converted to approximate SFT rates until exact sheet dimensions are modeled.

## Costing Formula

```text
Raw Material Cost = sum(material qty * material rate)
Factory Cost = Raw Material Cost * 1.65
Selling Price = Factory Cost / (1 - margin%)
Line Total = Selling Price * BOQ Qty
```
