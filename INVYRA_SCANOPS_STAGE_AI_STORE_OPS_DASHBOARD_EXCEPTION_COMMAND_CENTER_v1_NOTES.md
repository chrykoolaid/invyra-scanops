# Invyra ScanOps Stage AI — Store Ops Dashboard + Exception Command Center v1

Baseline: `Invyra_ScanOps_StageAH_InventoryDesktopSyncAPIContract_v1.zip`

Output: `Invyra_ScanOps_StageAI_StoreOpsDashboard_ExceptionCommandCenter_v1.zip`

## Purpose

Stage AI adds a local Store Ops Dashboard and Exception Command Center on top of the Stage AH Inventory Desktop Sync API Contract queue.

This stage is a visibility and triage layer only. It does not implement live desktop sync, API transport, approval execution, stock mutation, price mutation, promotion mutation, waste write-off, accounting mutation, or printer routing.

## Added

- New route: `/store-ops-dashboard`
- New page: `src/pages/StoreOpsDashboard.jsx`
- New local dashboard model: `src/lib/scanOpsStoreOpsDashboard.js`
- Operational Menu link: Store Ops Dashboard
- Store Status panel with Local Command Center / Desktop Not Connected / Contract Preview wording
- Priority Exceptions list with risk-ranked exception cards
- Workflow Health summary for Replenishment, Price / Promo, Shelf Tickets, Markdown, Waste / Shrink, Collaboration, and Desktop Sync
- Sync & Review Summary derived from Stage AH outbound queue and validation states
- Exception Command Center with filters:
  - All
  - High Risk
  - Blocked
  - Review
  - Deferred
  - Waste
- Selected Exception Detail with:
  - exception type
  - source workflow
  - risk level
  - sync status
  - desktop response preview
  - mutation blocked status
  - actor / role / device / shift
  - collaboration status
  - local triage status
- Safe local actions:
  - View Source
  - Open Sync Contract
  - View Payload
  - View Response
  - Add Local Review Note
  - Keep Deferred
  - Mark Locally Reviewed for Supervisor/Manager/Admin only
  - View AH Payloads
- Local triage persistence via `localStorage`
- Audit events for dashboard views, exception views, notes, local reviewed status, and kept-deferred state

## Role behavior

- Staff sees own/local visible work and may inspect exceptions and add local notes.
- Staff cannot mark local triage reviewed.
- Supervisor sees team-style review visibility and can mark local triage reviewed.
- Manager/Admin sees full store command-center scope and can mark local triage reviewed.

## Hard locks preserved

- Home launcher untouched.
- Keyboard untouched.
- Product Lookup untouched.
- Receiving untouched.
- Transfers untouched.
- Stock Count untouched.
- Stage AA Replenishment untouched.
- Stage AB Price Check / Promo Check untouched.
- Stage AC Shelf Ticket Queue untouched.
- Stage AD Markdown Approval untouched.
- Stage AE Waste Review untouched.
- Stage AF Governance untouched.
- Stage AG Collaboration untouched.
- Stage AH Desktop Sync Contract preserved and reused.
- No real API transport.
- No real desktop sync.
- No real printer routing.
- No live inventory / price / promo / waste / accounting mutation.
- No horizontal scrolling introduced.
- No toast spam introduced.

## Implementation notes

Stage AI derives dashboard records from `getDesktopSyncOutboundQueue()`, `validateDesktopSyncPayload()`, `buildDesktopResponsePreview()`, and `summarizeDesktopSyncQueue()` rather than introducing a fake command-center backend.

The dashboard states remain intentionally honest:

- Local Command Center
- Desktop Not Connected
- Contract preview only
- Review Required
- Blocked Conflict
- Deferred
- Mutation blocked

## Validation

Production build passed with Vite after implementation.
