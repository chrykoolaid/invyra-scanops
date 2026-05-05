# Invyra ScanOps — Stage D Markdowns + Waste v1

Baseline: `Invyra_ScanOps_StageC_Replenishment_GapScan_v1.zip`

## Scope completed

Stage D activates only:
- Markdowns
- Waste

Kept intact:
- Stage A Product Lookup
- Stage B Stock Count + Receiving
- Stage C Replenish + Gap Scan
- 3-column Home grid
- Invyra ScanOps product name
- Scan-first workflows
- Large touch buttons
- No dropdown-heavy workflow UI
- No fake completed task data

Still intentionally inactive / future-stage:
- Expiry / Freshness Engine
- Task System
- Offline + Sync Queue
- Decision Engine
- Full Labels engine
- Transfers
- Role / Device / Audit hardening

## Files added

- `src/pages/Markdowns.jsx`
- `src/pages/Waste.jsx`
- `INVYRA_SCANOPS_STAGE_D_MARKDOWNS_WASTE_v1_NOTES.md`

## Files updated

- `src/App.jsx`
- `src/pages/Home.jsx`
- `src/lib/scanOpsEvents.js`
- `src/lib/scanOpsInventoryFixtures.js`
- `src/lib/scanOpsRules.js`
- `README.md`

## What to test

1. Home still renders as a 3-column grid.
2. Markdowns tile is active and opens `/markdowns`.
3. Waste tile is active and opens `/waste`.
4. Expiry Check, Labels, and Transfers remain inactive.
5. Markdowns simulate scan works.
6. Markdowns item card shows SKU, barcode, price, expiry, and stock/location context.
7. Markdown reasons are large buttons, not dropdowns.
8. Changing reason changes suggested discount and new price.
9. Apply Markdown writes `MARKDOWN_APPLIED`.
10. Request Label writes `LABEL_PRINT_REQUESTED`.
11. Waste simulate scan works.
12. Waste quantity +/- controls work and do not go below 1.
13. Waste reasons are large buttons, not dropdowns.
14. Normal waste writes `WASTE_RECORDED`.
15. High-risk reasons or high quantity/value show approval-required handling and write `WASTE_APPROVAL_REQUIRED`.
16. No horizontal scrolling appears on Markdowns or Waste.
17. Replenish and Gap Scan still open and work from Stage C.
18. No Stage E/F/G/H/I/J features appear accidentally.

## Build note

Validate locally with:

```powershell
npm install
npm run build
```
