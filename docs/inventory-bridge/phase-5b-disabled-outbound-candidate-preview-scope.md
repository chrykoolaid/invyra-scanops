# INVYRA SCANOPS ↔ INVENTORY BRIDGE — PHASE 5B DISABLED OUTBOUND CANDIDATE PREVIEW SCOPE

Repository: `chrykoolaid/invyra-scanops`
Scope: ScanOps-side Phase 5B planning scope
Status: `SCOPE ONLY / NOT CODED / CAPTURE-ONLY / NON-OPERATIONAL`

---

## 1. Purpose

Phase 5B is the next safe ScanOps checkpoint after Phase 5A contract adapter closure.

The purpose is to define a disabled outbound candidate preview milestone before any transport, outbox processing, replay, or Inventory-call behavior is coded.

This phase must not activate the bridge and must not dispatch data outside ScanOps.

---

## 2. Phase 5A Baseline

ScanOps Phase 5A is closed:

```text
ScanOps PR #42 — disabled outbound contract adapter merged
ScanOps PR #43 — Phase 5A closure review merged
```

Inventory companion Phase 5B is closed:

```text
Inventory PR #53 — disabled ledger candidate preview source foundation merged
Inventory PR #54 — disabled ledger candidate preview validation gate merged
```

Current bridge state remains:

```text
DEFAULT OFF
DISABLED
NON-OPERATIONAL
CAPTURE-ONLY
READ-ONLY
NON-DISPATCHABLE
NON-TRANSPORTABLE
NON-OUTBOX-PROCESSABLE
NON-INVENTORY-CALLABLE
NON-WRITABLE
NO REPLAY
NO MUTATION
```

---

## 3. Proposed Phase 5B Milestone

Phase 5B should add a ScanOps-side disabled outbound candidate preview foundation.

This is not a transport adapter.
This is not outbox processing.
This is not replay.
This is not Inventory sync.

It should prepare pure deterministic helpers that can project what a captured ScanOps evidence envelope could look like as a future outbound candidate, while always returning a disabled preview object.

Allowed foundation pieces:

```text
pure outbound candidate preview builder
pure outbound candidate reason classifier
pure candidate idempotency key projection
pure candidate source/context snapshot projection
read-only outbound candidate diagnostics
static fixtures for preview-only candidate examples
validator proving no dispatch, no transport, no outbox processing, and no Inventory calls
```

---

## 4. Explicit Non-Goals

Phase 5B must not add:

```text
runtime bridge activation
Wi-Fi/IP transport
network calls
sync execution
Inventory calls
outbox processing
outbox writes
replay execution
replay queue writes
receipt handling
acknowledgement handling
Entity writes
ScanOps writes
Inventory writes
stock mutation
price mutation
POS mutation
order mutation
forecasting mutation
Item Master mutation
```

---

## 5. Outbound Candidate Preview Boundary

The Phase 5B preview may inspect an already-classified outbound ScanOps event envelope as data only.

It may return a read-only preview object containing:

```text
candidate_preview_id
candidate_status
candidate_reason
schema_version
event_type
event_id
source_system
source_device_id
source_store_id
source_session_id
idempotency_key
runtime_state
contract_classification
dispatchable=false
transportable=false
outbox_processable=false
inventory_callable=false
persistable=false
writable=false
```

It must not persist, enqueue, replay, dispatch, transmit, call Inventory, handle receipts, handle acknowledgements, or mutate ScanOps state.

---

## 6. Suggested ScanOps File Map

Suggested future file map for the coding pass:

```text
src/inventory-bridge/outboundCandidate/outboundCandidatePreview.js
src/inventory-bridge/outboundCandidate/outboundCandidateDiagnostics.js
src/inventory-bridge/outboundCandidate/index.js
scripts/validate-scanops-bridge-outbound-candidate-preview-disabled.mjs
```

Optional fixtures may be added only if they are static and preview-only:

```text
tests/fixtures/inventory-bridge/outbound-candidate-preview/*.json
```

---

## 7. Validator Expectations

The Phase 5B validator must prove:

```text
runtime disabled status remains false for enabled/ready/operational
contract adapter remains capture-only and non-dispatchable
outbound candidate preview is pure and deterministic
outbound candidate preview never calls transport
outbound candidate preview never processes outbox records
outbound candidate preview never calls Inventory
outbound candidate preview never writes Entity records
outbound candidate preview never mutates ScanOps state
outbound candidate preview never emits receipts or acknowledgements
unsafe enabled configuration attempts remain rejected or disabled
```

---

## 8. Acceptance Criteria

Phase 5B can pass only if:

```text
all added helpers are pure functions
all outputs are read-only preview/classification objects
all runtime status checks remain disabled
no network/import side effects exist
no persistence functions exist
no transport function is introduced
no outbox processor is introduced
no replay function is introduced
no Inventory caller is introduced
no acknowledgement or receipt handler is introduced
no mutation pathway exists
```

---

## 9. Decision

Decision:

```text
APPROVED AS NEXT SCANOPS CHECKPOINT — PHASE 5B DISABLED OUTBOUND CANDIDATE PREVIEW SCOPE
```

Phase 5B should proceed as a small controlled ScanOps milestone before any transport, pairing-runtime activation, outbox processing, replay, or Inventory-call implementation.
