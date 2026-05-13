# Invyra ScanOps Stage AN — Offline / Sync Reliability Hardening v1

## Baseline

- Started from `Invyra_ScanOps_StageAM_RolePermissionFinalHardening_v1.zip`.
- Stage AN was kept as a field reliability hardening pass only.

## Scope guard

Stage AN did **not** introduce a new sync product surface. This pass intentionally avoided:

- New workflow tiles
- New dashboards
- New filter-heavy panels
- Backend transport or API sync engines
- Desktop sync implementation
- Printer routing or direct printer connection
- Local network discovery
- Conflict editors or payload inspectors
- Role/permission redesign
- Home launcher redesign
- Keyboard redesign

## Operator wording normalized

The shared sync wording now uses the simple handheld language required for Stage AN:

- `Online`
- `Offline`
- `Saved locally`
- `Pending sync`
- `Synced`
- `Sync failed`
- `Retry`
- `Needs review`

Legacy wording such as `Waiting sync`, `Sync Pending`, and mixed queue labels was normalized where it affected the active scanner header, sync queue, workflow completion states, task labels, and the operational menu sync summary.

## Connection and pending state visibility

Updated shared scanner surfaces so operators can see connection/sync state without opening a dashboard:

- `WorkflowHeader` now renders simple labels such as `Online`, `Offline · 3 pending`, `Pending sync · 2`, and `Sync failed · 1`.
- `SyncStatusChip` and `SyncStatusBanner` reuse the same short wording.
- Offline item lookup now shows a short operator message instead of implying live lookup truth.
- Existing operational menu sync summary now uses `Pending`, `Review`, `Blocked`, and `Synced` rather than competing queue terms.

## Duplicate-submit and retry hardening

The sync queue now protects against duplicate-tap confusion without adding a full idempotency platform:

- Active pending/failed/review records are matched by workflow/request/line/item/event duplicate key.
- If the same active record is submitted again, the app keeps the existing pending sync item and records `Repeat tap ignored. Existing pending sync item kept.` in history.
- Retry acts on the existing sync record instead of creating a new queue record.
- Retry buttons disable while retrying.
- Retry all is blocked while already running and when no retryable records exist.

## Workflow surfaces inspected / hardened

### Product Lookup

- Header now communicates online/offline/pending/failed sync state.
- Offline unavailable lookup copy is short and direct.
- Pending metric wording was normalized.

### Receiving

- Submit still creates receiving evidence only; no direct stock mutation was added.
- Done state now states `Saved locally. Pending sync.`
- Submitted batch preview includes a `Sync` row.
- Duplicate submission protection is handled by the shared sync queue duplicate key.

### Stock Count

- Count line saves and session submit events are captured by the sync queue.
- Counting screen now shows a compact inline `Saved locally` / `Pending sync` message after a line or session submit.
- Existing count rows remain visible inside the workflow.
- Retry uses the existing pending sync record.

### Replenishment

- Replenishment task actions now surface `Saved locally. Pending sync.` in the DoneCard.
- Task action events are covered by shared pending/retry duplicate protection.
- No scheduling or assignment redesign was added.

### Price / Promo Check

- Verification results now show `Saved locally. Pending sync.`
- Price/promo verification events are covered by shared sync queue labels.
- Offline flow does not fake live price truth.

### Shelf Tickets

- Shelf ticket contract save now states `Saved locally. Pending sync for desktop/print handoff.`
- Existing print handoff language remains deferred; no printer routing or direct connection was added.
- Existing queue summary uses `Pending sync` rather than `Waiting`.

### Markdown

- Markdown request creation wording now states `Saved locally. Pending sync.`
- Stage AM role guards are preserved for markdown approval actions.
- No approval redesign or printer connection was added.

### Waste

- Waste draft and submit messages now state `Saved locally. Pending sync.` where the action is queued.
- Product master stock, price, promotion, and accounting mutation boundaries remain unchanged.
- Waste governance and reason logic were not redesigned.

### Transfers

- Transfer evidence submission now states `Saved locally. Pending sync.`
- Submitted transfer preview includes a `Sync` row.
- No inter-store network logic, receiving integration, or stock mutation backend was added.

### Sync Queue

- Page title/subtitle and tabs were simplified around `Pending sync`, `Needs Review`, and `Synced`.
- Retry controls now clearly say `Retry` / `Retrying...`.
- Empty state explains that scanner work appears as pending sync, sync failed, needs review, or synced.
- Detail view retains simple resolution actions and preserves Stage AM role gates.

## Files updated

- `src/components/scanner/WorkflowHeader.jsx`
- `src/components/scanner/SyncStatusChip.jsx`
- `src/components/scanner/SyncStatusBanner.jsx`
- `src/components/scanner/OperationalMenuPanel.jsx`
- `src/lib/scanOpsSync.js`
- `src/lib/scanOpsEvents.js`
- `src/lib/scanOpsReceivingTransfers.js`
- `src/lib/scanOpsStockCount.js`
- `src/lib/scanOpsTasks.js`
- `src/pages/ProductLookup.jsx`
- `src/pages/Receiving.jsx`
- `src/pages/StockCount.jsx`
- `src/pages/Replenish.jsx`
- `src/pages/PriceCheck.jsx`
- `src/pages/ShelfTickets.jsx`
- `src/pages/Markdowns.jsx`
- `src/pages/Waste.jsx`
- `src/pages/Transfers.jsx`
- `src/pages/SyncQueue.jsx`

## Validation

- `npm run lint` — PASS
- `npm run build` — PASS

## Commit suggestion

```bash
git add .
git commit -m "Stage AN offline sync reliability hardening"
```
