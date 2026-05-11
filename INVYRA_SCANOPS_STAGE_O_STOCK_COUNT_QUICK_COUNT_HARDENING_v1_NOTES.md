# Invyra ScanOps Stage O — Stock Count / Quick Count Operational Hardening v1

Baseline: `Invyra_ScanOps_StageN_WorkflowResultCards_BatchListCleanup_v1.zip`

## Locked guardrails preserved

- Home launcher was not touched.
- Stage M1.7 keyboard position/button sizing was not changed.
- Stage N compact item result card and batch list pattern was retained.
- Toasts were not reintroduced.
- No browser-level horizontal scrolling was introduced.
- Stock Count still submits count evidence only; it does not directly mutate stock.

## What changed

- Rebuilt Stock Count into a true setup → count → review → submitted flow.
- Added clear Quick Count vs Stocktake Session choice.
- Added Area / Location selection.
- Added Count Mode selection.
- Added count session metadata and evidence-only event payloads.
- Added compact session summary cards showing item count, variance count, and net difference.
- Added expected vs counted vs difference display on every counted item.
- Added variance reason handling during count entry.
- Added Review Count screen before submission.
- Added editable variance reason controls in review.
- Same-item duplicate scans update the existing count line rather than creating confusing duplicate rows.
- Submitted state clearly states that stock is not adjusted by the handheld.
- Added small default-prop hardening for shared Stage N primitives used by Stock Count.

## Acceptance checks covered

- Setup screen exists before scanning.
- User can choose Quick Count or Stocktake Session.
- User can choose Area / Location and Count Mode.
- Search/header appears only during active counting.
- Selected item uses compact Stage N result card.
- Counted quantity calculates variance against expected SOH.
- Variance reason appears only when there is a difference.
- Current count list remains visible.
- Review Count is required before Submit Evidence.
- Submit Evidence creates a stock count submitted event with `applies_stock_directly: false`.
- No Ready-to-scan text wall was reintroduced.
- No toast behavior was added.

## Verification

- `npm ci` completed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run typecheck` was attempted but still fails on existing project-wide JS/TS typing issues in shared UI/select, virtual keyboard, and decision/task helper files. No Stage O runtime build failure was found.

## Touched files

- `src/pages/StockCount.jsx`
- `src/lib/scanOpsStockCount.js`
- `src/components/scanner/WorkflowPrimitives.jsx`
- `src/components/scanner/TouchSelect.jsx`
- `src/lib/scanOpsWorkflowBatch.js`
