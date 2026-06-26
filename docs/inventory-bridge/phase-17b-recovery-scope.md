# INVYRA SCANOPS — PHASE 17B/17D RECOVERY SCOPE

Repository: `chrykoolaid/invyra-scanops`
Scope: ScanOps accelerated Phase 17B/17D
Status: `TEST/TRAINING RECOVERY CANDIDATE ONLY`

---

## Purpose

Phase 17B/17D adds a ScanOps-side recovery candidate over the Phase 16 response candidate shape.

This is candidate-only. It does not replay, retry, dispatch, receive, persist, emit, accept, apply, or change ScanOps data.

---

## Boundary

Allowed:

```text
static recovery fixtures
recovery descriptor shape
TEST/TRAINING recovery candidate result
LIVE blocker result
read-only summary helper
pure helper functions
validator script
```

Required state:

```text
LIVE blocked
PRODUCTION blocked
TEST recovery candidate only
TRAINING recovery candidate only
ScanOps capture-only
Inventory system of record
no operational data change
```

---

## Required Fields

```text
recovery_id
environment
response_id
review_id
event_id
event_key
source_system
source_store_id
target_system
failure_code
recovery_gate
recovery_profile
```

---

## Closure Rule

```text
PASS ONLY AS TEST/TRAINING RECOVERY CANDIDATE
```
