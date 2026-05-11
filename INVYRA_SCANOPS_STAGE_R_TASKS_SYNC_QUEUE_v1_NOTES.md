# Invyra ScanOps Stage R — Tasks + Sync Queue v1

Baseline used:
- Invyra_ScanOps_StageQ_WasteMarkdownsShelfTicketGovernance_v1.zip

## Goal
Stage R adds a controlled local Tasks + Sync Queue visibility/recovery layer without becoming a full offline sync engine.

## Hard locks preserved
- Home launcher was not edited.
- Manual keyboard / soft keyboard components were not redesigned.
- Stage N compact result-card / batch-list workflow direction remains in place.
- Stage O Stock Count remains evidence-only.
- Stage P Receiving + Transfers remain request/lifecycle based.
- Stage Q Waste / Markdowns / Shelf Tickets remain governance/evidence/request flows.
- No toasts were added.
- No direct stock mutation, price mutation, or printer integration was added.

## Added / changed

### Tasks workspace
- Rebuilt Tasks into an operator task list and task detail workspace.
- Added My Tasks / All Team Tasks scope switch.
- Added simple filters: My Tasks, Due Today, In Progress, Completed.
- Added task states aligned to Stage R:
  - not_started
  - in_progress
  - blocked
  - completed
  - cancelled
  - sync_pending
  - sync_failed
- Added task types aligned to Stage R:
  - stock_count
  - receiving
  - transfer
  - waste
  - markdown
  - shelf_ticket
  - product_lookup
  - general_check
- Added Start Task, Mark Blocked, Complete Task behavior.
- Completing a task creates a sync-queue event through the normal ScanOps event pipeline.
- Added linked workflow launcher behavior with safe URL context.
- Linked workflow launch does not auto-submit, auto-add items, mutate stock, change price, or print.

### Task-linked workflow context
- Stock Count can receive task context for count type, area, and mode.
- Waste can receive safe reason context.
- Markdowns can receive safe reason context.
- Shelf Tickets can receive safe ticket type, paper size, and reason context.
- These are setup prefills only.

### Sync Queue workspace
- Added `/sync-queue` route.
- Kept `/inventory-sync` as a compatibility route pointing to Sync Queue.
- Rebuilt Inventory Sync into a clearer Sync Queue surface.
- Added Pending / Failed / Synced tabs.
- Added Sync Queue detail view with payload/source request snapshot.
- Added retry behavior that updates the queue item without duplicating the source request.
- Added retry-all behavior for pending/failed queue items.
- Synced records remain visible under Synced history.

### Header / menu access
- Added a shared clickable Sync Status chip.
- App header and workflow page headers now use the chip instead of banner-style sync messaging.
- Chip states:
  - Synced
  - Pending
  - Sync Issue
  - Offline
- Tapping the chip opens Sync Queue.
- Operational menu now includes Tasks, Sync Queue, Settings, and Device Info access.

### Sync queue backend shape
- Reworked local sync queue into Stage R-compatible queue records:
  - queueId / id
  - sourceWorkflow
  - sourceRequestId
  - status
  - title / summary
  - createdBy / createdRole / createdAt
  - lastAttemptAt / syncedAt / failureReason / retryCount
  - payloadSnapshot
- Submission-style events now create sync queue items; internal UI/menu/audit events are excluded.
- Sync Queue is still local visibility/recovery only, not a full offline engine.

## Build validation
- `npm ci` completed.
- `npm run lint` passed.
- `npm run build` passed. Base44 proxy warning is expected when VITE_BASE44_APP_BASE_URL is not set.

## Main files changed
- src/App.jsx
- src/components/scanner/AppHeader.jsx
- src/components/scanner/PageHeader.jsx
- src/components/scanner/OperationalMenuPanel.jsx
- src/components/scanner/SyncStatusChip.jsx
- src/lib/scanOpsSync.js
- src/lib/scanOpsTasks.js
- src/pages/Tasks.jsx
- src/pages/SyncQueue.jsx
- src/pages/InventorySync.jsx
- src/pages/StockCount.jsx
- src/pages/Waste.jsx
- src/pages/Markdowns.jsx
- src/pages/ShelfTickets.jsx

## Acceptance test focus
1. Home launcher unchanged.
2. Keyboard unchanged.
3. Tasks opens from header/menu and existing route.
4. Task list shows task cards.
5. Task detail opens cleanly.
6. Start Task changes status to In Progress.
7. Complete Task changes status to Completed.
8. Task-linked workflow opens the correct workflow without auto-submitting.
9. Sync Queue opens from the header chip and menu.
10. Submitted Stock Count evidence appears in Sync Queue.
11. Submitted Receiving evidence appears in Sync Queue.
12. Submitted Transfer request appears in Sync Queue.
13. Submitted Waste evidence appears in Sync Queue.
14. Submitted Markdown request appears in Sync Queue.
15. Submitted Shelf Ticket request appears in Sync Queue.
16. Failed/pending sync item can be viewed.
17. Retry does not duplicate the source request.
18. No toasts appear.
19. No Ready-to-scan text walls return.
20. No horizontal clipping.
