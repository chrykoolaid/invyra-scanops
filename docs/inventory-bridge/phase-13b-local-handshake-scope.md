# INVYRA SCANOPS — PHASE 13B/13D LOCAL HANDSHAKE SCOPE

Repository: `chrykoolaid/invyra-scanops`
Scope: ScanOps accelerated Phase 13B/13D
Status: `TEST/TRAINING LOCAL HANDSHAKE CANDIDATE ONLY`

---

## Purpose

Phase 13B/13D adds a ScanOps-side local handshake candidate over the Phase 12 runner shape.

This is candidate-only. It does not open a live path, start a service, call Inventory, or change ScanOps data.

---

## Boundary

Allowed:

```text
static handshake fixtures
handshake descriptor shape
TEST/TRAINING local handshake candidate result
LIVE blocker result
read-only status helper
pure helper functions
validator script
```

Required state:

```text
LIVE blocked
PRODUCTION blocked
TEST local handshake candidate only
TRAINING local handshake candidate only
ScanOps capture-only
Inventory system of record
no operational data change
```

---

## Required Fields

```text
handshake_id
environment
runner_id
runner_key
handoff_id
source_system
source_device_id
source_store_id
target_system
local_endpoint_id
handshake_gate
handshake_profile
```

---

## Closure Rule

```text
PASS ONLY AS TEST/TRAINING LOCAL HANDSHAKE CANDIDATE
```
