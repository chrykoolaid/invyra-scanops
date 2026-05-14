# Invyra ScanOps — Pilot Run 6 Real Sync Handoff / Inventory Desktop Contract Trial v1

## Baseline

```text
Invyra_ScanOps_PilotRun5_OperationalTruthContractTrial_v1.zip
```

## Output

```text
Invyra_ScanOps_PilotRun6_RealSyncHandoff_InventoryDesktopContractTrial_v1.zip
```

## Purpose

Pilot Run 6 validates the next contract layer after Pilot Run 5: ScanOps must be able to package truthful, structured records that a future Invyra Inventory Desktop system could receive, review, approve, reject, print, or commit later.

This run does not connect to Inventory Desktop. It proves the handheld is ready to hand off clean local truth without pretending that real backend sync, stock mutation, print success, audit upload, or approval infrastructure already exists.

The key question for this run is:

```text
When real desktop sync exists later, will the handheld send clean, honest, non-fake operational records?
```

## Non-goals

Pilot Run 6 is a contract validation pass, not a backend integration pass.

Not in scope:

```text
real API integration
real database sync
real Inventory Desktop connection
real approval engine
real printer infrastructure
RFID
BOPIS / ship-from-store
dashboard build
filter build
new workflow tiles
route-host rewrite
AppEscapeHeader rewrite
large UI redesign
fake operational seed expansion
```

Allowed in this package:

```text
notes/evidence file
route-by-route handoff contract checklist
sample handoff payload shape
small shared handoff contract helper
copy-only corrections where UI wording implied real sync/commit success
tiny blocker-only patches to keep handoff state honest
```

## Implementation summary

Added:

```text
INVYRA_SCANOPS_PILOT_RUN_6_REAL_SYNC_HANDOFF_CONTRACT_NOTES.md
src/lib/scanOpsInventoryDesktopHandoffContract.js
```

Updated:

```text
src/pages/SyncQueue.jsx
src/lib/scanOpsSync.js
src/lib/scanOpsStockCount.js
src/components/scanner/OperationalMenuPanel.jsx
src/components/scanner/SyncStatusChip.jsx
src/components/scanner/SyncStatusBanner.jsx
src/components/scanner/WorkflowHeader.jsx
src/pages/StockCount.jsx
src/pages/Replenish.jsx
src/pages/Waste.jsx
```

The updates are intentionally small. They do not add new workflow tiles, new filters, backend calls, route-host changes, AppEscapeHeader changes, or fake data.

## Handoff State Model

Pilot Run 6 separates local truth state from future desktop handoff state.

| Handoff state | Meaning | Pilot Run 6 rule |
|---|---|---|
| `NOT_HANDOFF_ELIGIBLE` | The route is lookup-only or informational. | No desktop handoff record should be created. |
| `HANDOFF_DRAFT` | Operator has started a local record, but it is not ready. | Must stay local and editable. |
| `HANDOFF_BLOCKED` | Required data, permission, item identity, or valid workflow state is missing. | Explain what blocks handoff. |
| `HANDOFF_REVIEW_REQUIRED` | Supervisor/desktop review is needed before commit. | Must not claim approval or live stock mutation. |
| `HANDOFF_READY` | The local record is valid for future desktop handoff. | Still not a desktop commit. |
| `HANDOFF_PENDING_SYNC` | The record is waiting for future transport / handoff retry. | Must not claim desktop receipt. |
| `HANDOFF_SYNC_FAILED` | A handoff attempt failed or cannot proceed. | Preserve local evidence and keep retry/review clear. |
| `HANDOFF_COMMITTED` | Real Inventory Desktop/backend commit completed. | Not used in Pilot Run 6 because real infrastructure does not exist. |

Important rule:

```text
committed_at must remain null unless real backend commit infrastructure exists.
```

## Required Handoff Payload Fields

Every future handoff-capable action should be able to describe itself with this structure:

```text
schema_version
local_event_id
idempotency_key
source_route
workflow_type
truth_state
handoff_state
item_id
item_name
barcode / sku where available
quantity / count / issue value where relevant
operator_context
device_context
location_context
evidence_summary
requires_review
approval_state
print_state
sync_state
created_at_local
updated_at_local
committed_at
```

The added helper file provides this shape as a local contract utility only. It does not send data anywhere.

## Route-by-route Contract

### `/scan`

Expected:

```text
truth_state: LOOKUP_ONLY
handoff_state: NOT_HANDOFF_ELIGIBLE
```

Must not create:

```text
stock movement
desktop handoff event
approval request
sync queue record
audit upload
print job
```

Pass condition:

```text
Scan lookup remains lookup-only and does not enter the desktop handoff pipeline.
```

### `/stock-count`

Expected:

```text
truth_state: DRAFT / PENDING_REVIEW / PENDING_SYNC / SYNC_READY
handoff_state: HANDOFF_DRAFT / HANDOFF_REVIEW_REQUIRED / HANDOFF_READY
```

Must include:

```text
counted item
count value
operator context
device context
location/store context where available
evidence timestamp
review requirement
```

Must not claim:

```text
official inventory adjusted
approved count
desktop committed correction
```

Pilot Run 6 applied correction:

```text
Stock Count fallback copy now says Pending future handoff rather than generic Pending sync.
Legacy stock-count sync labels now map to Pending future handoff / Ready for handoff.
```

Pass condition:

```text
Stock Count can prepare a reviewable handoff record without pretending stock was adjusted.
```

### `/gap-scan`

Expected:

```text
truth_state: EVIDENCE_CAPTURED / PENDING_REVIEW
handoff_state: HANDOFF_REVIEW_REQUIRED
```

Must include:

```text
item
gap reason / shelf issue
evidence notes
operator context
whether reorder, shrink, or waste decision is still pending
```

Must not claim:

```text
reorder created
shrink posted
stock movement created
desktop action committed
```

Pass condition:

```text
Gap Scan hands off evidence, not a fake decision.
```

### `/replenish`

Expected:

```text
truth_state: PENDING_REVIEW / PENDING_SYNC / BLOCKED
handoff_state: HANDOFF_REVIEW_REQUIRED / HANDOFF_READY / HANDOFF_BLOCKED
```

Must include:

```text
item
requested shelf fill quantity if available
reason
source route
operator/device context
whether movement confirmation is still pending
```

Must not claim:

```text
stock moved
backroom quantity reduced
shelf quantity increased
desktop movement committed
```

Pilot Run 6 applied correction:

```text
Replenishment saved-result copy now says Pending future desktop handoff.
The result row is labeled Handoff instead of Sync.
```

Pass condition:

```text
Replenishment creates a future movement request, not a fake completed movement.
```

### `/expiry-check`

Expected:

```text
truth_state: EVIDENCE_CAPTURED / PENDING_REVIEW
handoff_state: HANDOFF_REVIEW_REQUIRED
```

Must include:

```text
item
expiry date / expiry risk where available
recommended next action if already present
evidence timestamp
whether markdown/waste approval is required
```

Must not claim:

```text
markdown approved
waste approved
stock written off
desktop adjustment committed
```

Pass condition:

```text
Expiry Check hands off expiry evidence cleanly without merging expiry, markdown, and waste into fake completion.
```

### `/shelf-tickets`

Expected:

```text
truth_state: TICKET_REQUESTED / PRINT_PENDING / BLOCKED
handoff_state: HANDOFF_READY / HANDOFF_BLOCKED
```

Must include:

```text
item
ticket type / size where available
requested quantity
operator/device context
print_state
```

Must not claim:

```text
printed successfully
printer accepted job
print history created
desktop print event committed
```

Pass condition:

```text
Shelf Ticket records are print requests only until real printer infrastructure exists.
```

### `/inventory-sync`

Expected:

```text
truth_state: LOCAL_ONLY / PENDING_SYNC / SYNC_FAILED / SYNC_READY
handoff_state: HANDOFF_READY / HANDOFF_PENDING_SYNC / HANDOFF_SYNC_FAILED
```

Must show:

```text
local records waiting
records blocked
records review-required
records ready for future desktop handoff
records failed locally
```

Must not claim:

```text
backend synced
desktop received
audit uploaded
inventory committed
```

Pilot Run 6 applied correction:

```text
The Sync Queue surface now presents as Inventory Handoff.
Header copy says local records for future desktop review.
The screen uses Pending handoff / Review blocked / Ready language instead of implying real sync success.
Transport copy says Not connected / local pilot.
Detail rows avoid claiming desktop receipt in pilot mode.
```

Pass condition:

```text
Inventory Sync becomes an honest local handoff readiness screen, not a fake sync success screen.
```

### Supervisor / operational review surfaces

Expected:

```text
review visible
source route visible
item visible
operator/device context visible where available
state visible
no fake approval history
```

Pilot Run 6 applied correction:

```text
Operational menu summary labels now use Ready / Pending handoff language rather than Synced where operator-facing.
Waste review queue no longer shows a generic Synced pill; it shows Local review instead.
Global sync chip/banner/header copy now says handoff readiness/failure where operator-facing.
```

Pass condition:

```text
Supervisor can understand what needs review before Desktop/Backend commit exists.
```

## Scenario Checklist

### Scenario A — Lookup exclusion

```text
Open /scan.
Search or scan a known item.
Confirm item appears.
Confirm it remains lookup-only.
Confirm it does not create a handoff record.
```

Pass if:

```text
Lookup is excluded from desktop handoff.
```

### Scenario B — Count handoff

```text
Open /stock-count.
Count a known item.
Review the resulting state.
Confirm the app can describe the record as review-ready or handoff-ready.
Confirm no official stock adjustment is claimed.
```

Pass if:

```text
Count creates a valid future desktop handoff record without fake commitment.
```

### Scenario C — Gap evidence handoff

```text
Open /gap-scan.
Capture a gap issue.
Confirm evidence is readable.
Confirm the state requires review.
Confirm no reorder/shrink/stock movement is created.
```

Pass if:

```text
Gap evidence is handoff-ready for review, not auto-resolved.
```

### Scenario D — Replenishment movement request

```text
Open /replenish.
Attempt a replenishment action.
Confirm the result is pending/review/ready/blocked.
Confirm no stock movement is claimed.
```

Pass if:

```text
Replenishment creates a future movement request, not a fake completed movement.
```

### Scenario E — Expiry evidence handoff

```text
Open /expiry-check.
Review an expiry item.
Confirm expiry evidence is visible.
Confirm markdown/waste remains pending review.
```

Pass if:

```text
Expiry Check sends evidence to future review, not fake markdown or waste.
```

### Scenario F — Shelf ticket print request

```text
Open /shelf-tickets.
Request a ticket.
Confirm the state is requested / print pending / blocked.
Confirm no fake printed success appears.
```

Pass if:

```text
Shelf ticketing creates a print request contract only.
```

### Scenario G — Inventory Handoff readiness

```text
Open /inventory-sync.
Review local handoff state.
Confirm records are grouped by pending, review/blocked, ready, failed, or discarded.
Confirm no backend success is claimed.
```

Pass if:

```text
Inventory Sync shows future handoff readiness, not fake real sync.
```

## Blocker Rules

Only block Pilot Run 6 if:

```text
fake backend sync appears real
fake desktop receipt appears real
fake stock movement appears real
fake approval appears real
fake print success appears real
fake audit upload appears real
HANDOFF_COMMITTED / committed_at is used without real infrastructure
handoff state is unclear
operator cannot tell whether a record is local, pending, blocked, ready, failed, or committed
lookup-only scan creates a transaction-style handoff
route crashes
Home escape missing
horizontal scrolling
build fails
lint fails
```

Everything else goes to backlog.

## Backlog Items

Do not implement in Pilot Run 6:

```text
real Inventory Desktop API endpoint
real transport retry engine
real desktop approval queue
real printer routing / printer job queue
real audit upload service
RFID item capture
BOPIS / ship-from-store workflows
backend stock mutation
new dashboard or filters
```

Recommended next step after Pilot Run 6:

```text
Pilot Run 7 — Handoff Review Evidence / Desktop Receiver Mock Review Trial
```

Only proceed there after the Pilot Run 6 evidence proves the handheld records are clean enough to review.

## Validation Results

```text
npm run lint: passed
npm run build: passed
```
