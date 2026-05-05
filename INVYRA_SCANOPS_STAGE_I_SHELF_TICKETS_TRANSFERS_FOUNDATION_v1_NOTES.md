# Invyra ScanOps Stage I — Shelf Tickets + Transfers Foundation v1

Baseline used:

```text
Invyra_ScanOps_StageH_Decision_Engine_Foundation_v1.zip
```

## Scope correction applied

The old generic Labels placeholder was replaced with supermarket-specific **Shelf Tickets**.

Reason:

```text
ScanOps shelf-ticket workflow is not a generic label engine.
It is a paper shelf-ticket batch creation workflow that syncs from handheld to desktop.
```

Stage I now contains:

```text
Stage I.1 — Shelf Ticket Request Foundation
Stage I.2 — Transfers Foundation
```

## Stage I.1 — Shelf Ticket Request Foundation

Added a new Shelf Tickets workflow page.

Workflow:

```text
Select ticket size/type
Select ticket reason
Scan item
Resolve PLU / GTIN / barcode / SKU / internal item ID / batch / lot
Add item to current shelf ticket batch
Scan more items
Send batch to desktop queue through Inventory Sync
```

Important boundaries:

```text
No fake printing.
No full desktop print infrastructure.
No printer registry or printer routing.
No claim that a ticket was physically printed.
Desktop preview/printing remains deferred.
```

Added files:

```text
src/pages/ShelfTickets.jsx
src/lib/scanOpsShelfTickets.js
src/lib/scanOpsShelfTicketRules.js
src/lib/scanOpsShelfTicketFixtures.js
src/components/scanner/ShelfTicketBatchCard.jsx
src/components/scanner/ShelfTicketSizeSelector.jsx
src/components/scanner/ShelfTicketLineCard.jsx
```

Added shelf-ticket events:

```text
SHELF_TICKET_BATCH_CREATED
SHELF_TICKET_SIZE_SELECTED
SHELF_TICKET_ITEM_SCANNED
SHELF_TICKET_ITEM_ADDED
SHELF_TICKET_ITEM_REMOVED
SHELF_TICKET_BATCH_SENT_TO_DESKTOP
SHELF_TICKET_BATCH_QUEUED_FOR_SYNC
SHELF_TICKET_BATCH_CANCELLED
SHELF_TICKET_BATCH_RECEIVED_BY_DESKTOP
```

## Stage I.2 — Transfers Foundation

Added a new Transfers workflow page.

Workflow:

```text
Select transfer type
Scan/select source location
Scan item
Resolve PLU / GTIN / barcode / SKU / internal item ID / batch / lot
Enter quantity or weight
Scan/select destination location
Review transfer
Confirm transfer
Queue transfer event to Inventory Sync
```

Supported transfer types:

```text
BACKROOM_TO_SHELF
SHELF_TO_BACKROOM
DAMAGED_TO_HOLDING
EXPIRY_TO_REVIEW_AREA
PROMO_DISPLAY_TRANSFER
```

Important boundaries:

```text
No silent stock mutation.
ScanOps records the transfer intent.
Invyra Inventory applies official movement after sync.
Quantity above local snapshot availability is queued as supervisor review required.
```

Added files:

```text
src/pages/Transfers.jsx
src/lib/scanOpsTransfers.js
src/lib/scanOpsTransferRules.js
src/lib/scanOpsTransferFixtures.js
src/components/scanner/TransferStepCard.jsx
src/components/scanner/TransferReviewCard.jsx
```

Added transfer events:

```text
TRANSFER_STARTED
TRANSFER_TYPE_SELECTED
TRANSFER_SOURCE_SELECTED
TRANSFER_ITEM_SCANNED
TRANSFER_QUANTITY_ENTERED
TRANSFER_DESTINATION_SELECTED
TRANSFER_REVIEWED
TRANSFER_COMPLETED
TRANSFER_CANCELLED
TRANSFER_EXCEPTION_RECORDED
TRANSFER_QUEUED_FOR_SYNC
TRANSFER_SUPERVISOR_REVIEW_REQUIRED
```

## Updated files

```text
src/App.jsx
src/pages/Home.jsx
src/pages/ProductLookup.jsx
src/pages/GapScan.jsx
src/pages/Markdowns.jsx
src/pages/InventorySync.jsx
src/lib/scanOpsEvents.js
src/lib/scanOpsDecisionRules.js
README.md
```

## Acceptance checks performed

```text
Home remains a 3-column launcher.
Shelf Tickets replaced the old inactive Labels placeholder.
Transfers changed from inactive placeholder to active workflow tile.
Decision Engine now has deterministic shelf-ticket and transfer recommendations.
Shelf-ticket batches queue to Inventory Sync / desktop queue events.
Transfer events queue to Inventory Sync and explicitly mark no direct stock mutation.
Offline mode remains handled by the Stage G sync queue.
No fake printed-success state was added.
```

## Deferred

```text
Full desktop shelf-ticket print workspace
Printer registry / printer routing / retry infrastructure
Electronic shelf ticket integration
Store-to-store transfer reconciliation
Final role/device/session hardening
Final audit trace hardening
```
