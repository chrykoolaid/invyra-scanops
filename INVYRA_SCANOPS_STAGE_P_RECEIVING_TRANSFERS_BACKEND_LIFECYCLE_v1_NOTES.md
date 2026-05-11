# Invyra ScanOps Stage P — Receiving + Transfers Backend Request Lifecycle v1

Baseline: `Invyra_ScanOps_StageO_StockCountQuickCountHardening_v1.zip`

## Locked guardrails preserved

- Home launcher untouched.
- Stage M.1.7 keyboard implementation untouched.
- Stage O Stock Count workflow untouched.
- No toast calls added.
- No direct stock mutation added.
- No horizontal-scroll workflow pattern added.
- Transfers remain step-based for handheld use.

## Changed files

- `src/pages/Receiving.jsx`
- `src/pages/Transfers.jsx`
- `src/lib/scanOpsRequestLifecycle.js`
- `src/lib/scanOpsEvents.js`

## Receiving changes

- Rebuilt Receiving as a supplier/PO evidence workflow.
- Added supplier setup, Against PO / Ad-hoc Delivery mode, and PO/reference validation.
- Search clearing now clears only the active item/search field, not supplier/PO setup.
- Added receiving item controls for received quantity, condition, and discrepancy.
- Added duplicate-line merge behavior by item + condition + discrepancy.
- Same item with a different discrepancy can stay as a separate evidence row.
- Added review screen with supplier, PO/reference, item count, discrepancy count, expected vs received difference, condition, discrepancy, and remove line control.
- Submit creates a receiving request/evidence record only and records an event for sync.
- Submit does not post stock directly.

## Transfers changes

- Rebuilt Transfers as a six-step request lifecycle:
  1. Transfer type
  2. Source / destination / reason
  3. Scan item
  4. Quantity
  5. Review
  6. Submitted
- Added transfer types matching Stage P scope: Backroom → Shelf, Shelf → Backroom, Store → Store, Department → Department.
- Added governed reason list: Replenishment, Stock relocation, Customer demand, Display fill, Damaged area cleanup, Correction request, Other.
- Added source/destination validation to prevent same-location requests.
- Added source availability snapshot and request review before submit.
- Submit creates a transfer request only and records an event for sync.
- Submit does not reduce source stock or increase destination stock directly.

## Backend/request lifecycle additions

- Added `scanOpsRequestLifecycle.js` with local request persistence for:
  - Receiving requests
  - Transfer requests
  - Receiving line normalization / duplicate merge logic
  - Request status mapping to submitted or sync_pending depending on network mode
  - Actor, role, device, store, created timestamp, submitted timestamp, and source workflow metadata
- Added event types:
  - `RECEIVING_ITEM_ADDED`
  - `RECEIVING_EVIDENCE_SUBMITTED`
  - `TRANSFER_REQUEST_SUBMITTED`

## Validation run

- `npm install --no-audit --no-fund`
- `npm run build` passed
- `npm run lint` passed

## Acceptance coverage

Covers Stage P acceptance tests P-A1 through P-A18 at source level. UI screenshot validation is still recommended in Base44 preview/device viewport, especially Receiving review, Transfer step flow, and keyboard non-regression.
