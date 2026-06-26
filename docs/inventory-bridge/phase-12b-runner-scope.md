# INVYRA SCANOPS — PHASE 12B/12D RUNNER SCOPE

Repository: `chrykoolaid/invyra-scanops`
Scope: ScanOps accelerated Phase 12B/12D
Status: `TEST/TRAINING RUNNER CANDIDATE ONLY`

---

## Purpose

Phase 12B/12D adds a ScanOps-side runner candidate over the Phase 11 handoff shape.

This is candidate-only. It does not execute a bridge path and does not change ScanOps or Inventory data.

---

## Boundary

Allowed:

```text
static runner fixtures
runner descriptor shape
TEST/TRAINING runner candidate result
LIVE blocker result
read-only status helper
pure helper functions
validator script
```

Required state:

```text
LIVE blocked
PRODUCTION blocked
TEST runner candidate only
TRAINING runner candidate only
ScanOps capture-only
Inventory system of record
no operational data change
```

---

## Required Fields

```text
runner_id
environment
handoff_id
handoff_key
review_id
evidence_id
source_system
source_device_id
source_store_id
target_system
runner_gate
runner_profile
```

---

## Closure Rule

```text
PASS ONLY AS TEST/TRAINING RUNNER CANDIDATE
```
