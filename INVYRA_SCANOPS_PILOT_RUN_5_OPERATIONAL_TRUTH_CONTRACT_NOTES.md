# Invyra ScanOps — Pilot Run 5 Operational Truth Contract Trial v1

## Baseline

```text
Invyra_ScanOps_PilotRun4_StoreDaySimulation_v1.zip
```

## Output

```text
Invyra_ScanOps_PilotRun5_OperationalTruthContractTrial_v1.zip
```

## Purpose

Pilot Run 5 validates that the existing ScanOps handheld app tells the truth about operational state before bigger features are added.

This run exists to prove that the scanner can clearly distinguish between:

```text
operator evidence captured
local draft saved
pending supervisor/manager review
pending sync
sync-ready handoff
sync failure
blocked action
real committed backend/printer/approval result
```

The scanner must not pretend that live inventory, printer routing, backend sync, audit upload, or approval engine work happened unless that contract actually exists.

## Scope boundary

Pilot Run 5 is a pilot validation pass, not a new feature stage.

### Not in scope

```text
RFID
BOPIS / ship-from-store
full backend/API integration
printer infrastructure
real approval engine
dashboard/reporting build
new workflow tiles
filter expansion
route-host rewrite
AppEscapeHeader rewrite
UI redesign
seed/demo operational data expansion
```

### Allowed in this package

```text
Add this notes/evidence file.
Add route-by-route truth-state checklist.
Patch wording where the UI falsely implied real completion, movement, approval, print, or sync success.
Patch blocker-only operational-truth issues without redesigning the app.
```

## Operational truth-state definitions

| State | Meaning | Pilot Run 5 rule |
|---|---|---|
| LOOKUP_ONLY | Item data is shown only. | No movement, sync success, count, markdown, waste, reorder, or audit claim is created by lookup. |
| DRAFT | Operator has started local work. | Draft state must not imply official stock change. |
| EVIDENCE_CAPTURED | Operator evidence was saved locally. | Evidence must remain separate from approval/backend commit. |
| PENDING_REVIEW | Supervisor/manager review is required. | Must show that review is pending, not already approved. |
| PENDING_SYNC | Local action is waiting for backend sync. | Must not claim backend success. |
| SYNC_READY | Local record is valid for future backend handoff. | Must not mutate live stock itself. |
| SYNC_FAILED | Sync attempt could not complete. | Must preserve local evidence and avoid false success. |
| BLOCKED | Required permission/data/state is missing. | Must explain why the operator cannot continue. |
| COMMITTED | Real backend/printer/approval contract completed. | Not expected in this pilot unless real infrastructure exists. |

## Route-by-route contract

### /scan

Expected truth:

```text
LOOKUP_ONLY
```

Validation contract:

```text
Product lookup may resolve item identity and show item details.
It must not create stock movement, count evidence, replenishment, markdown, waste, reorder, printer job, or sync success.
```

Pass condition:

```text
Scan remains lookup-only and does not become a transaction.
```

### /stock-count

Expected truth:

```text
DRAFT / EVIDENCE_CAPTURED / PENDING_REVIEW / PENDING_SYNC
```

Validation contract:

```text
Stock Count captures count evidence only.
Evidence acceptance means local count evidence has been accepted for workflow purposes.
Evidence lock means the local session is read-only.
No stock adjustment is applied by the handheld.
```

Pilot Run 5 correction applied:

```text
The UI no longer presents handheld stock-count review as generic “Approved” / “Closed” completion.
The package uses “Evidence Accepted” and “Evidence Locked” copy to avoid implying official inventory approval or live stock correction.
```

Pass condition:

```text
Stock Count captures and locks evidence without pretending inventory was officially corrected.
```

### /gap-scan

Expected truth:

```text
EVIDENCE_CAPTURED / PENDING_REVIEW
```

Validation contract:

```text
Gap Scan may capture shelf-gap evidence and recommended next action.
It must not auto-create reorder, shrink, live stock movement, or fake supervisor action.
```

Pass condition:

```text
Gap Scan records the problem and keeps the decision path clear.
```

### /replenish

Expected truth:

```text
EVIDENCE_CAPTURED / PENDING_REVIEW / PENDING_SYNC / BLOCKED
```

Validation contract:

```text
Replenishment may record local shelf-fill or exception evidence.
It must not claim live backroom-to-shelf stock movement was posted.
It must not change inventory numbers without backend sync.
```

Pilot Run 5 correction applied:

```text
The “Shelf Filled” action was retitled to “Shelf Fill Evidence.”
Completed-style replenishment state was normalized to “Pending Sync.”
Quantity wording now says evidence/requested quantity rather than live movement quantity.
```

Pass condition:

```text
Replenishment can capture operator evidence while clearly stating that live stock was not changed by handheld.
```

### /expiry-check

Expected truth:

```text
EVIDENCE_CAPTURED / PENDING_REVIEW
```

Validation contract:

```text
Expiry Check may capture expiry/freshness truth and recommend review path.
It must not auto-create markdown, waste, or approval.
It must not merge expiry, markdown, and waste into one unclear completed action.
```

Pass condition:

```text
Expiry Check remains evidence/review until real markdown/waste approval workflows are invoked separately.
```

### /shelf-tickets

Expected truth:

```text
TICKET_REQUESTED / PRINT_PENDING / HANDOFF_READY / BLOCKED
```

Validation contract:

```text
Shelf Tickets may create ticket request and print-ready handoff contract.
It must not claim printer accepted the job.
It must not claim printing succeeded.
It must not create fake print history.
```

Pilot Run 5 correction applied:

```text
The fake “Printed / Completed” state was renamed to “Handoff Closed (Manual).”
The close action now says “Close Handoff.”
The event payload keeps print_claimed false.
The UI states that closing the handoff is manual only and no printer result is claimed.
```

Pass condition:

```text
Shelf ticketing remains honest before printer infrastructure exists.
```

### /inventory-sync

Expected truth:

```text
LOCAL_ONLY / PENDING_SYNC / SYNC_FAILED / SYNC_READY
```

Validation contract:

```text
Inventory Sync may show local queue, failed attempts, review states, and future handoff state.
It must not claim real backend sync success unless the adapter returns a real committed response.
The current local pilot adapter does not push to a real desktop inventory backend.
```

Pass condition:

```text
Inventory Sync does not misrepresent backend state.
```

### Supervisor / review surfaces already present

Expected truth:

```text
Review visible, outcome understandable, no fake approval engine claim.
```

Validation contract:

```text
Review surfaces should show source route, item, state, actor/role context where available, and whether the record is pending, blocked, local-only, or simulated.
Review actions must not invent approval history, audit upload, backend movement, or printer success.
```

Pass condition:

```text
Operators can tell what is real, pending, blocked, local-only, or evidence-only.
```

## Pilot Run 5 test scenarios

### Scenario A — Lookup truth

```text
1. Open /scan.
2. Search or scan a known item.
3. Confirm the item appears clearly.
4. Confirm the state is lookup-only.
5. Confirm no fake movement, history, count, print, or sync success is created.
```

Pass if:

```text
Scan remains item lookup, not a transaction.
```

### Scenario B — Count truth

```text
1. Open /stock-count.
2. Select or create a known count session.
3. Add count evidence.
4. Submit/review where available.
5. Confirm wording says evidence, review, locked, local, or pending sync.
6. Confirm no silent stock adjustment appears.
```

Pass if:

```text
Stock Count captures local evidence without pretending official inventory changed.
```

### Scenario C — Gap truth

```text
1. Open /gap-scan.
2. Capture or inspect shelf gap state.
3. Confirm gap evidence is clear.
4. Confirm no fake reorder, shrink, or live movement is created.
```

Pass if:

```text
Gap Scan records the problem but does not fake the decision.
```

### Scenario D — Replenishment truth

```text
1. Open /replenish.
2. Scan a known item.
3. Choose replenishment evidence or exception outcome.
4. Save.
5. Confirm the saved card says local / pending sync.
6. Confirm the route does not claim live stock moved.
```

Pass if:

```text
Replenishment does not pretend stock moved without backend confirmation.
```

### Scenario E — Expiry truth

```text
1. Open /expiry-check.
2. Review expiry item.
3. Confirm expiry/freshness state is readable.
4. Confirm markdown/waste approval is not faked.
```

Pass if:

```text
Expiry Check remains evidence/review until real approval workflows exist.
```

### Scenario F — Shelf ticket truth

```text
1. Open /shelf-tickets.
2. Select item and request ticket if available.
3. Save contract or mark ready for handoff.
4. Confirm wording says request, handoff, pending, blocked, or manual close.
5. Confirm no fake printer success is claimed.
```

Pass if:

```text
Shelf ticketing is honest before printer infrastructure exists.
```

### Scenario G — Sync truth

```text
1. Open /inventory-sync.
2. Review sync state.
3. Retry a pending item if available.
4. Confirm local/pending/failed/review wording is honest.
5. Confirm no fake backend sync success is shown.
```

Pass if:

```text
Inventory Sync does not misrepresent backend state.
```

## Blocker rule

Only block Pilot Run 5 if any of these are observed:

```text
fake stock movement appears real
fake approval appears real
fake print success appears real
fake backend sync success appears real
fake audit/history appears real
action wording falsely says completed
primary state is unclear
operator cannot understand whether action is real, pending, blocked, local-only, or simulated
route crash
Home escape missing
horizontal scrolling
build fails
lint fails
```

Everything else goes to backlog.

## Files updated in this package

```text
INVYRA_SCANOPS_PILOT_RUN_5_OPERATIONAL_TRUTH_CONTRACT_NOTES.md
src/lib/scanOpsStockCount.js
src/pages/StockCount.jsx
src/lib/scanOpsReplenishment.js
src/pages/Replenish.jsx
src/lib/scanOpsShelfTicketContracts.js
src/pages/ShelfTickets.jsx
```

## What changed

```text
Added the Pilot Run 5 operational truth contract evidence pack.
Normalized stock-count review wording from fake approval/close wording to evidence accepted / evidence locked wording.
Normalized replenishment wording so local shelf-fill work is evidence pending sync, not live stock movement.
Normalized shelf-ticket close wording so manual handoff closure does not claim printer success.
Forced shelf-ticket close event payload to keep print_claimed false.
No workflow tiles added.
No filters added.
No dashboards added.
No backend/API work added.
No RFID/BOPIS/printer/real approval work added.
No route-host or AppEscapeHeader changes.
```

## Recommended git commands

```powershell
git status
git add INVYRA_SCANOPS_PILOT_RUN_5_OPERATIONAL_TRUTH_CONTRACT_NOTES.md src/lib/scanOpsStockCount.js src/pages/StockCount.jsx src/lib/scanOpsReplenishment.js src/pages/Replenish.jsx src/lib/scanOpsShelfTicketContracts.js src/pages/ShelfTickets.jsx
git commit -m "Validate ScanOps operational truth contract"
git pull --rebase
git push
```
