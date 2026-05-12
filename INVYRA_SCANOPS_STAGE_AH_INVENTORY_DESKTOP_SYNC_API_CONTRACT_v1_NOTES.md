# Invyra ScanOps Stage AH — Inventory Desktop Sync API Contract v1

Baseline: `Invyra_ScanOps_StageAG_MultiDeviceSessionCollaboration_v1.zip`

Output: `Invyra_ScanOps_StageAH_InventoryDesktopSyncAPIContract_v1.zip`

## Purpose

Stage AH adds the local/demo-safe contract layer between ScanOps handheld and the desktop Inventory system. It does not implement real desktop sync, API transport, WebSockets, cloud sync, background daemon behavior, printer routing, stock mutation, price mutation, promotion mutation, or accounting/write-off mutation.

The new workspace shows what handheld events would be packaged for desktop, what envelope fields are required, what desktop responses would look like, and which payloads are queued, deferred, blocked, local-only, or accepted for review.

## Added

- `src/pages/DesktopSyncContract.jsx`
  - New Desktop Sync Contract workspace.
  - Shows Contract Preview / Not Connected status.
  - Shows current user, role, shift, device, store, and location context.
  - Shows outbound queue records for Replenishment, Price/Promo Check, Shelf Tickets, Markdown Approval, Waste Review, Device/Shift Governance, and Session Collaboration.
  - Shows selected payload details, governance envelope, collaboration envelope, workflow payload summary, local Validate Contract action, desktop response preview, and contract event log.

- `src/lib/scanOpsDesktopSyncContract.js`
  - Shared contract version: `SCANOPS_DESKTOP_SYNC_V1`.
  - Desktop response version: `INVYRA_DESKTOP_SYNC_RESPONSE_V1`.
  - Sync status model including queued, deferred, accepted-for-review, blocked-conflict, blocked-permission, blocked-stale-task, blocked-schema, acknowledged, rejected, and local-only states.
  - Workflow-specific event contracts for Stage AA through Stage AG.
  - Standard outbound envelope builder binding Stage AF governance context and Stage AG collaboration context.
  - Local validation helpers for missing context, permission-blocked actions, unresolved collaboration conflicts, stale task ownership, duplicate approval attempts, and review-required workflow rules.
  - Mock desktop response builder that keeps mutation blocked and clearly marks review queues.

- `src/App.jsx`
  - Added `/desktop-sync-contract` route.

- `src/components/scanner/OperationalMenuPanel.jsx`
  - Added Operational Menu link near Device & Shift Governance and Session Collaboration.

- `src/lib/scanOpsEvents.js`
  - Added local audit event types for viewing and validating Desktop Sync Contract previews.

## Demo outbound queue

- Shelf Ticket Batch #004 — queued / accepted for print review.
- Waste Conflict #002 — review required / conflict blocked.
- Price Check Aisle 3 — queued / accepted for price review.
- Markdown Approval #006 — blocked conflict / manager review.
- Replenishment Aisle 3 — accepted for review.
- Collaboration Takeover #003 — deferred acknowledgement.
- Device Session Started — local-only governance proof.

## Hard-lock preservation

This pass does not redesign or rewrite:

- Home launcher
- Keyboard
- Product Lookup
- Receiving
- Transfers
- Stock Count
- Stage AA Replenishment
- Stage AB Price Check / Promo Check
- Stage AC Shelf Ticket Queue
- Stage AD Markdown Approval
- Stage AE Waste Review
- Stage AF Governance
- Stage AG Collaboration

## Validation posture

Stage AH deliberately keeps all desktop behavior honest:

- Contract Preview
- Transport: Not connected
- Desktop: Inventory Desktop Pending
- Sync Deferred where appropriate
- Accepted for Review where appropriate
- Blocked by Conflict / Permission / Stale Task / Schema where appropriate
- Mutation allowed: false

## Build verification

Production build passed with `npm run build`.
