# Invyra ScanOps — Stage G Inventory Sync Foundation v1

Baseline:

```text
Invyra_ScanOps_StageF_Task_System_v1.zip
```

Stage title:

```text
Stage G — Inventory Sync Foundation with PLU / GTIN / SKU Support
```

## Main correction

Stage G is not only an offline sync queue. It establishes the scanner-to-inventory-system foundation.

```text
Invyra Inventory system = source of truth
Invyra ScanOps = handheld execution layer
Local snapshot = scanner-side cache
Sync queue = pending event transport
```

## Supermarket identity support

Stage G is not SKU-only. Product identity can resolve through:

```text
PLU
GTIN / UPC / EAN / barcode
Internal SKU
Internal item ID
Scale code
Batch ID
Lot ID
```

Supported sell types:

```text
PACKAGED
LOOSE_EACH
LOOSE_WEIGHT
RANDOM_WEIGHT
CASE_PACK
PREPARED_FOOD
```

## Files added

```text
src/pages/InventorySync.jsx
src/lib/scanOpsSync.js
src/lib/inventorySystemAdapter.js
src/lib/inventorySnapshot.js
src/lib/productIdentityResolver.js
src/components/scanner/SyncStatusBanner.jsx
INVYRA_SCANOPS_STAGE_G_INVENTORY_SYNC_FOUNDATION_v1_NOTES.md
```

## Files updated

```text
src/App.jsx
src/pages/Home.jsx
src/pages/ProductLookup.jsx
src/pages/StockCount.jsx
src/pages/Receiving.jsx
src/pages/Replenish.jsx
src/pages/GapScan.jsx
src/pages/Markdowns.jsx
src/pages/Waste.jsx
src/components/scanner/AppHeader.jsx
src/components/scanner/PageHeader.jsx
src/lib/scanOpsEvents.js
README.md
```

## What changed

- Added active Inventory Sync tile on Home.
- Preserved Home as a clean 3-column launcher.
- Added Inventory Sync page with connection state, inventory snapshot summary, queue metrics, local sync records, retry, retry all, pull inventory, and demo online/offline controls.
- Added local inventory snapshot with supermarket-ready PLU / barcode / SKU examples.
- Added PLU example: Banana Loose / PLU 4011.
- Added shared product identity resolver.
- Added sync-aware event recording through `createScanOpsEvent()`.
- Existing scanner workflow events now create local sync records unless they are sync-system events.
- Added honest statuses for queued, synced, failed, and conflict placeholders.
- Added app-wide sync banner for scanner workflow pages.
- Product Lookup now reads from the shared inventory snapshot.
- Gap Scan now includes a produce PLU gap scenario.
- Markdowns and Waste now resolve products from the shared inventory snapshot.
- Stock Count and Receiving now write sync-aware inventory events.

## Events added

```text
STOCK_COUNT_SUBMITTED
RECEIVING_CONFIRMED
INVENTORY_SYNC_STARTED
INVENTORY_SYNC_SUCCEEDED
INVENTORY_SYNC_FAILED
INVENTORY_PULL_STARTED
INVENTORY_PULL_SUCCEEDED
INVENTORY_PULL_FAILED
INVENTORY_PUSH_STARTED
INVENTORY_PUSH_SUCCEEDED
INVENTORY_PUSH_FAILED
LOCAL_EVENT_SAVED
SYNC_QUEUED
SYNC_STARTED
SYNC_SUCCEEDED
SYNC_FAILED
SYNC_RETRY_REQUESTED
SYNC_CONFLICT_DETECTED
SYNC_STATUS_VIEWED
OFFLINE_MODE_ENTERED
ONLINE_MODE_RESTORED
```

## What to test

```text
1. Home remains a 3-column launcher.
2. Inventory Sync tile opens /inventory-sync.
3. No queue list appears on Home.
4. Product Lookup resolves a snapshot item.
5. Gap Scan shows the Produce PLU gap test option.
6. Markdowns reads Greek Yoghurt from the inventory snapshot.
7. Waste reads Chicken Breast from the inventory snapshot.
8. Stock Count submits a sync-aware event.
9. Receiving confirms a sync-aware event.
10. Open Inventory Sync.
11. Tap Simulate Offline.
12. Complete a task while offline.
13. Confirm the scanner shows an offline / queued banner.
14. Open Inventory Sync and confirm the task event appears as Waiting to sync or Sync failed after retry.
15. Retry while offline and confirm it does not pretend to sync.
16. Tap Simulate Online.
17. Retry the event and confirm it becomes Synced.
18. Confirm retry does not duplicate the local sync record.
19. Confirm the Sync Event Detail page shows Local Event ID and Inventory Event ID.
20. Confirm no Stage H Decision Engine, Labels full engine, Transfers, or final audit hardening appeared.
```

## Git commit command

```powershell
git status
git add .
git commit -m "Add ScanOps Stage G inventory sync identity foundation"
git status
git push origin main
```

If push is rejected:

```powershell
git pull --rebase origin main
git status
git push origin main
```
