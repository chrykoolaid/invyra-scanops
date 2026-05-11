# Invyra ScanOps Stage S

## PLU / Barcode Alias / Supermarket Search Intelligence v1

Baseline: `Invyra_ScanOps_StageR_TasksSyncQueue_v1.zip`

## What changed

- Added a shared supermarket item search resolver for barcode, barcode alias, PLU, SKU, supplier code, product name, department/category, and shelf/location lookup.
- Added richer local product identity seed data for Stage S testing, including Milk 2L, Greek Yoghurt alias barcode, loose bananas PLU 4011, organic bananas PLU 94011, apples PLU 3283, and bread loaf barcode.
- Updated the shared workflow header search behavior so all workflow pages use the same resolver instead of duplicate search logic.
- Added match reason labels such as `Matched by barcode`, `Matched by barcode alias`, `Matched by PLU`, `Matched by product name`, `Matched by department`, and `Matched by shelf location`.
- Added touch-friendly multi-result cards with explicit `Select` buttons.
- Added unknown item evidence handling. Unknown scans/searches can be attached as review-only evidence and queued for Sync Queue review.
- Removed fallback demo-product auto-selection from workflow scan handlers so unknown values no longer silently resolve to a default item.

## Safety / governance retained

- Home launcher was not changed.
- Keyboard design was not redesigned.
- Search does not auto-submit workflow records.
- Search does not directly mutate stock, price, transfer, waste, markdown, or shelf ticket records.
- Unknown item evidence does not create a real product.
- Shelf Tickets still create requests only; no direct print integration.
- Waste/Markdowns/Receiving/Transfers remain evidence/request lifecycle flows.
- Stock Count remains evidence-only.
- No toasts were added.

## Files changed

- `src/lib/productIdentityResolver.js`
- `src/lib/scanOpsItemEntry.js`
- `src/lib/scanOpsUnknownItems.js`
- `src/lib/inventorySnapshot.js`
- `src/lib/scanOpsEvents.js`
- `src/lib/scanOpsSync.js`
- `src/components/scanner/WorkflowHeader.jsx`
- `src/components/scanner/WorkflowPrimitives.jsx`
- `src/pages/ProductLookup.jsx`
- `src/pages/Scan.jsx`
- `src/pages/StockCount.jsx`
- `src/pages/Receiving.jsx`
- `src/pages/Transfers.jsx`
- `src/pages/Waste.jsx`
- `src/pages/Markdowns.jsx`
- `src/pages/ShelfTickets.jsx`
- `src/pages/Replenish.jsx`
- `src/pages/GapScan.jsx`
- `src/pages/ExpiryCheck.jsx`

## Build validation

- `npm run build` passed.
- `npm run lint` passed.
