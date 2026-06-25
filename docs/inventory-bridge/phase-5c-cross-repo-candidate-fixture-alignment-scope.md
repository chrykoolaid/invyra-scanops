# INVYRA SCANOPS ↔ INVENTORY BRIDGE — PHASE 5C CROSS-REPO CANDIDATE FIXTURE ALIGNMENT SCOPE

Repository: `chrykoolaid/invyra-scanops`
Scope: ScanOps-side Phase 5C planning scope
Status: `SCOPE ONLY / NOT CODED / CAPTURE-ONLY / NON-OPERATIONAL`

---

## 1. Purpose

Phase 5C is the next safe ScanOps checkpoint after Phase 5B candidate preview closure on both sides.

The purpose is to define a cross-repo candidate fixture alignment milestone between:

```text
ScanOps disabled outbound candidate preview
Inventory disabled ledger candidate preview
```

This phase should prove that both repositories describe the same candidate evidence shape consistently before any transport, outbox processing, replay, Inventory call, receipt, acknowledgement, or write path is introduced.

---

## 2. Confirmed Baseline

Inventory Phase 5C scope is merged:

```text
Inventory PR #56 — Phase 5C candidate fixture alignment scope merged
```

ScanOps Phase 5B is closed:

```text
ScanOps PR #45 — disabled outbound candidate preview source foundation merged
ScanOps PR #46 — disabled outbound candidate preview validation gate merged
ScanOps PR #47 — Phase 5B closure review merged
```

Inventory Phase 5B is closed:

```text
Inventory PR #53 — disabled ledger candidate preview source foundation merged
Inventory PR #54 — disabled ledger candidate preview validation gate merged
Inventory Phase 5B closure review present on main
```

Current bridge state remains:

```text
DEFAULT OFF
DISABLED
NON-OPERATIONAL
CAPTURE-ONLY ON SCANOPS
READ-ONLY
NON-DISPATCHABLE
NON-TRANSPORTABLE
NON-OUTBOX-PROCESSABLE
NON-INVENTORY-CALLABLE
NON-INGESTIVE
NON-WRITABLE
NO REPLAY
NO RECEIPTS
NO ACKNOWLEDGEMENTS
NO MUTATION
```

---

## 3. Proposed Phase 5C Milestone

Phase 5C should add static fixture alignment between the ScanOps and Inventory candidate-preview foundations.

The milestone should compare shared fixture cases such as:

```text
valid evidence envelope shape
schema mismatch
event type mismatch
store mismatch
device mismatch
malformed payload
runtime disabled rejection
unsafe enabled configuration attempt
```

The goal is not to connect the systems.

The goal is to prove that both sides agree on candidate identity, source context, contract classification, idempotency key shape, and disabled preview outcome.

---

## 4. Allowed ScanOps-Side Foundation Pieces

Allowed pieces for the future coding pass:

```text
static cross-repo candidate fixture definitions
ScanOps fixture expectation table
pure fixture projection helper
read-only alignment diagnostics
validator proving ScanOps-side fixture outcomes remain capture-only, disabled, non-dispatchable, and non-writable
```

Suggested ScanOps file map:

```text
src/inventory-bridge/fixtures/candidateAlignmentFixtures.js
src/inventory-bridge/fixtures/candidateAlignmentExpectations.js
src/inventory-bridge/fixtures/candidateAlignmentDiagnostics.js
src/inventory-bridge/fixtures/index.js
scripts/validate-scanops-bridge-candidate-fixture-alignment-disabled.mjs
```

---

## 5. Explicit Non-Goals

Phase 5C must not add:

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

## 6. Acceptance Criteria

Phase 5C can pass only if:

```text
all fixtures are static
all alignment helpers are pure functions
all diagnostics are read-only
all outputs remain disabled previews
all accepted/dispatchable/transportable/outbox-processable/inventory-callable/ingestible/writable flags remain false
capture_only remains true on ScanOps outcomes
no persistence function exists
no transport function exists
no outbox processor exists
no replay function exists
no Inventory caller exists
no receipt or acknowledgement function exists
no mutation pathway exists
```

---

## 7. Cross-Repo Alignment Principle

The ScanOps-side Phase 5C fixture set should mirror the Inventory Phase 5C fixture set.

ScanOps should describe expected outbound candidate projection.

Inventory should describe expected inbound ledger-candidate interpretation.

The two sides should agree on evidence identity and disabled candidate outcome without exchanging data.

---

## 8. Decision

Decision:

```text
APPROVED AS NEXT SCANOPS CHECKPOINT — PHASE 5C CROSS-REPO CANDIDATE FIXTURE ALIGNMENT SCOPE
```

Phase 5C should proceed as a small controlled ScanOps companion milestone before any transport, outbox processing, replay, Inventory-call, receipt, acknowledgement, write, or activation work.
