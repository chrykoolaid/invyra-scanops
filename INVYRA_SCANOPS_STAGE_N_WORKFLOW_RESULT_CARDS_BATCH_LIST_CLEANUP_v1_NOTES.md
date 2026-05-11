# Invyra ScanOps Stage N — Workflow Result Cards + Batch List Cleanup v1

Baseline: `Invyra_ScanOps_StageM1_7_KeyboardButtonSizePolish_v1.zip`

## Locked guardrails preserved

- Home launcher was not touched.
- Header search pattern was preserved.
- Stage M1.7 keyboard position and button sizing were not changed.
- Ready-to-scan body cards were not reintroduced.
- Toast suppression remains in place.
- Stock-affecting workflows still write request/evidence events only; no direct inventory mutation was added.

## What changed

- Added shared compact workflow primitives:
  - `EmptyState`
  - compact `ItemSummaryCard` identity/location treatment
  - `BatchList` for current scanned/request lists
- Added `scanOpsWorkflowBatch.js` to normalize selected scan item and workflow batch item shapes.
- Product Lookup now uses the compact item result card and expanded quick actions.
- Receiving now keeps a visible current receiving batch.
- Stock Count now keeps a visible current count list and replaces same-item lines instead of creating confusing duplicates.
- Waste now keeps a visible current waste log.
- Markdowns now keeps a visible current markdown batch.
- Shelf Tickets now uses the shared current batch pattern.
- Replenish now shows current replenish requests.
- Gap Scan now shows current gap evidence.
- Transfers remains step-based and now shows the selected item card with source availability during the item/quantity step.
- Scan and Expiry Check idle states were changed to quiet “No item selected.” states.

## Verification

- `npm ci` completed.
- `npm run lint` passed.
- `npm run build` passed.

## Touched files

- `src/components/scanner/WorkflowPrimitives.jsx`
- `src/lib/scanOpsWorkflowBatch.js`
- `src/pages/ProductLookup.jsx`
- `src/pages/Receiving.jsx`
- `src/pages/StockCount.jsx`
- `src/pages/Markdowns.jsx`
- `src/pages/Waste.jsx`
- `src/pages/ShelfTickets.jsx`
- `src/pages/Replenish.jsx`
- `src/pages/GapScan.jsx`
- `src/pages/Transfers.jsx`
- `src/pages/ExpiryCheck.jsx`
- `src/pages/Scan.jsx`
