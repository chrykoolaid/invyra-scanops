**Welcome to your Base44 project**

This project contains the Invyra ScanOps handheld scanner prototype.

## Invyra ScanOps stage status

Current package: Stage I — Shelf Tickets + Transfers Foundation.

Active scanner workflows:
- Product Lookup
- Stock Count
- Receiving
- Replenish
- Gap Scan
- Markdowns
- Waste
- Expiry Check
- Tasks
- Inventory Sync
- Shelf Tickets
- Transfers

Invyra Inventory remains the source of truth. ScanOps is the handheld execution layer. Scanner workflows read from the local inventory snapshot, record operator-confirmed events, and queue those events through Inventory Sync.

Home remains a clean 3-column scanner launcher. No task list, sync list, decision list, ticket batch list, or transfer queue is shown on Home.

## Stage G — Inventory Sync Foundation

Stage G added:
- Inventory Sync tile and dedicated Inventory Sync page
- Local inventory snapshot cache
- Product identity resolver for PLU, GTIN/barcode, SKU, scale code, internal item ID, batch, and lot
- Demo adapter for future Invyra Inventory API wiring
- Offline / online demo network mode
- Local sync queue
- Retry and Push Queue actions
- Honest sync states: saved on device, waiting to sync, syncing, synced, failed, conflict, needs review
- App-wide sync banner on scanner workflow pages

## Stage H — Decision Engine Foundation

Stage H adds deterministic supermarket decisioning to existing ScanOps workflows. It does not add a Home tile and does not redesign the 3-column launcher.

Decision rule:

```text
Decision Engine recommends.
Operator confirms.
Inventory system applies after sync.
```

Added foundations:
- `src/lib/scanOpsDecisionEngine.js`
- `src/lib/scanOpsDecisionRules.js`
- `src/lib/scanOpsDecisionFixtures.js`
- `src/components/scanner/DecisionRecommendationCard.jsx`

Recommendation outputs include:

```text
recommendedAction
confidence
reasonText
riskLevel
requiredRole
linkedWorkflow
eventToCreate
taskToCreate
```

## Stage I.1 — Shelf Ticket Request Foundation

Stage I.1 replaces the previous generic Labels placeholder with supermarket-specific Shelf Tickets.

Shelf Tickets workflow:

```text
Select ticket size/type
Scan item
Resolve PLU / GTIN / barcode / SKU / internal item ID / batch / lot
Add item to the shelf ticket batch
Scan more items
Send batch to desktop ticket queue through Inventory Sync
```

Important boundaries:
- ScanOps creates a paper shelf-ticket batch.
- Desktop receives the batch later for preview/printing.
- Stage I does not build full desktop print infrastructure.
- Stage I does not claim anything printed unless a real print flow exists.

Added shelf-ticket foundations:
- `src/pages/ShelfTickets.jsx`
- `src/lib/scanOpsShelfTickets.js`
- `src/lib/scanOpsShelfTicketRules.js`
- `src/lib/scanOpsShelfTicketFixtures.js`
- `src/components/scanner/ShelfTicketBatchCard.jsx`
- `src/components/scanner/ShelfTicketSizeSelector.jsx`
- `src/components/scanner/ShelfTicketLineCard.jsx`

Shelf-ticket events:

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

Stage I.2 adds scan-first transfer requests.

Transfer workflow:

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

Important boundaries:
- ScanOps records transfer intent.
- ScanOps does not directly mutate official inventory stock.
- Invyra Inventory applies official stock movement after sync.
- Quantity above local snapshot availability is queued as supervisor-review required.

Added transfer foundations:
- `src/pages/Transfers.jsx`
- `src/lib/scanOpsTransfers.js`
- `src/lib/scanOpsTransferRules.js`
- `src/lib/scanOpsTransferFixtures.js`
- `src/components/scanner/TransferStepCard.jsx`
- `src/components/scanner/TransferReviewCard.jsx`

Transfer events:

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

## Still deferred

- Full desktop shelf-ticket preview/print workspace
- Full printer registry / routing / retry infrastructure
- Electronic shelf ticket integration
- Store-to-store transfer reconciliation
- Final role/device/session hardening
- Final audit trace hardening
- Full conflict resolver
- Real multi-device backend merge logic

## Local run

```bash
npm install
npm run dev
```

## Stage I.2 — Transfer Validation Hardening v1

This pass keeps Stage I intact and focuses only on transfer workflow correctness.

Hardened transfer behavior:

```text
Source and destination are no longer prefilled.
Operator must select or scan the source and destination.
TRANSFER_STARTED is recorded when the transfer workspace opens.
TRANSFER_REVIEWED is recorded before confirm, block, or supervisor-review outcomes.
Damaged, expiry, freshness, and promo-display transfers expose large touch reason buttons.
Damaged/expiry transfer reasons are required before confirm.
Quantity above local snapshot no longer records as a normal completed transfer.
Quantity above local snapshot records supervisor-review and exception events instead.
Supervisor-review transfer events are held in Inventory Sync as Needs review.
Retry all does not push Needs review transfer events as if they were approved.
```

Transfer validation boundaries:

```text
No direct stock mutation.
No fake transfer approval.
No automatic approval of quantity exceptions.
No desktop reconciliation built yet.
Inventory remains the official movement applier after sync/approval.
```

## Stage J — Header Operational Menu + Role / Device / Audit Hardening

Stage J adds the compact `☰` operational menu in the existing app header. It does not add another Home row and does not add a Stage J Home tile; Home remains the existing 3-column launcher.

Menu coverage:
- Daily Controls: Sync Now, Scanner Test, Device Status, Shelf Ticket Queue Status
- Session: Recent Audit Events, Request Supervisor Override, End Session
- Settings: Scanner Settings, Display & Sound, Offline Mode, Store / Department Context
- Support: Help / Workflow Guide, About ScanOps

Stage J hardening:
- Operational audit events support actorUserId, actorName, actorRole, deviceId, scannerId, storeId, departmentId, sessionId, environment, traceId, and timestamp.
- Scanner Test accepts barcode / PLU / SKU / internal ID and records an audit trace without mutating stock.
- Staff blocked attempts create audit events.
- Supervisor / Manager / Admin approval behavior can be validated through the prototype-only role preview in Device Status.

Boundaries preserved:
- No backend server.
- No printer infrastructure.
- No full login/user management.
- Invyra Inventory remains source of truth; ScanOps remains the handheld execution layer.
