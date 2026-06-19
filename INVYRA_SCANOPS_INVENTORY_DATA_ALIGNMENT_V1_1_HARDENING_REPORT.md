# INVYRA SCANOPS — INVENTORY DATA ALIGNMENT v1.1 HARDENING REPORT

## Status

Implemented and build/lint verified.

## Scope

Narrow hardening pass only. Phase E workflows were not refactored.

## Fixes Implemented

### 1. Inventory snapshot evidence

Added `src/lib/inventory/inventorySnapshotEvidence.js`.

Markdown capture/request/handoff records now carry snapshot evidence fields:

- `inventory_snapshot_id`
- `inventory_snapshot_ref`
- `inventory_snapshot_hash`
- `inventory_record_version`
- `last_inventory_sync_at`
- `inventory_snapshot`
- `source`
- `schema_version`

Attached to:

- Markdown attribute evidence capture
- Markdown request creation
- Markdown approval/return/reject events
- Markdown label/printer handoff events
- Markdown ScanOpsRecord payloads
- Markdown IndexedDB outbox records

### 2. IndexedDB event_outbox now receives Markdown events

The existing `event_outbox` store is now used for Markdown events through `addOutboxEvent()`.

Relevant Markdown events are mirrored into IndexedDB with:

- `event_id`
- `event_type`
- `workflow = MARKDOWN`
- `source = SCANOPS`
- `sync_status = queued`
- `inventory_snapshot_ref`
- `inventory_snapshot_id`
- `inventory_snapshot_hash`
- `payload`

The legacy/local sync queue remains preserved.

### 3. Warm-cache mock leakage prevention

Updated `src/lib/inventorySystemAdapter.js`.

Added `_syncCacheMode` tracking and cache clearing when `DATA_MODE` changes, preventing mock-warmed cache rows from being used in `inventory_bridge` mode.

### 4. Markdown Suggestions cached-item loading

Added provider method:

- `getCachedItems(limit)`

Implemented in:

- `MockInventoryProvider`
- `InventoryBridgeProvider`

Updated `MarkdownSuggestionsPanel` to load cached items through `getCachedItems()` instead of relying on `searchItems("", 100)`.

### 5. Lint cleanup

Removed unused imports only from:

- `src/pages/PrinterSettings.jsx`
- `src/pages/Replenish.jsx`
- `src/pages/SyncHandoff.jsx`

No workflow logic was changed in those files.

## Files Changed

- `src/lib/inventory/inventorySnapshotEvidence.js` — new snapshot evidence helper
- `src/lib/inventory/inventoryProviderInterface.js`
- `src/lib/inventory/inventoryBridgeProvider.js`
- `src/lib/inventory/mockInventoryProvider.js`
- `src/lib/inventory/inventoryConfig.js`
- `src/lib/inventorySystemAdapter.js`
- `src/lib/scanOpsItemAttributes.js`
- `src/lib/scanOpsMarkdownApproval.js`
- `src/lib/scanOpsRecordWriter.js`
- `src/components/scanner/MarkdownSuggestionsPanel.jsx`
- `src/pages/Markdowns.jsx`
- `src/pages/PrinterSettings.jsx`
- `src/pages/Replenish.jsx`
- `src/pages/SyncHandoff.jsx`

## Verification

```bash
npm run build
BUILD_EXIT:0
```

```bash
npm run lint
LINT_EXIT:0
```

## Guardrails Preserved

- ScanOps does not mutate Inventory stock.
- ScanOps does not mutate Item Master price.
- ScanOps does not create StockMovement from lookup/cache sync.
- ScanOps does not create POSLineItem from lookup/cache sync.
- Mock fixtures remain isolated behind mock/dev mode.
- `inventory_bridge` mode does not silently fall back to mock fixtures.
- Snapshot cache and event outbox remain separate.
- Phase E workflows were not refactored.

## Known Limitation

The InventoryBridgeProvider is still a controlled development bridge stub until the real Inventory/Desktop API contract is wired.
