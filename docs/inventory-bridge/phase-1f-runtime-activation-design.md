# Invyra ScanOps Bridge Phase 1F Runtime Activation Design

Status: specification only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Phase: `1F`  
Runtime state: not implemented and not activated

## Purpose

Phase 1F defines the future runtime activation design for the ScanOps <-> Inventory Bridge from the ScanOps side. This document is a design boundary only. It does not authorize or implement live bridge behavior.

The bridge must remain non-operational until a later explicit implementation phase is approved and reviewed.

## Current baseline

The completed Phase 1D-D and Phase 1E work created a non-operational safety stack and documentation layer.

Current local validation baseline:

```text
Inventory bridge stack validation PASS
ScanOps bridge stack validation PASS
```

ScanOps remains a capture-first system. It may collect scanner evidence, but it must not directly mutate Inventory operational state.

## Design goal

The future bridge should support local / server-first movement of ScanOps evidence into Inventory without allowing ScanOps to directly mutate Inventory entities.

The target pattern is:

```text
ScanOps capture event
  -> ScanOps local outbox
  -> trusted local transport
  -> Inventory inbound ledger
  -> Inventory validation / quarantine / receipt
  -> ScanOps receipt reconciliation
```

The bridge must be evidence-first and receipt-aware, not mutation-first.

## ScanOps-side responsibilities

ScanOps is responsible for:

- Capturing scanner evidence locally.
- Assigning stable event identifiers.
- Creating an idempotency key.
- Writing future events to a local outbox before transport.
- Preserving offline-first behavior.
- Sending only signed, scoped, schema-valid events in a future implementation phase.
- Retrying only according to a defined retry policy.
- Recording Inventory receipts.
- Surfacing rejected, quarantined, or retry-blocked submissions to operators.
- Respecting Inventory-owned trust and kill-switch decisions.

ScanOps must never assume that a sent event changed Inventory state.

## Future outbound event model

A future outbound event envelope should include at minimum:

```text
event_id
schema_version
event_type
source_system
source_device_id
source_session_id
source_user_id
store_id
inventory_instance_id
occurred_at
created_at
sequence_number
idempotency_key
payload_hash
payload
signature
```

ScanOps must treat this envelope as submitted evidence only. It is not proof of Inventory acceptance.

## Future receipt handling

ScanOps should store Inventory receipts for every submission attempt:

```text
receipt_id
event_id
status
reason_code
received_at
processed_at
inventory_instance_id
ledger_reference
retry_allowed
operator_action_required
receipt_signature
```

ScanOps must treat these receipt statuses distinctly:

```text
ACCEPTED_TO_LEDGER
REJECTED_SCHEMA
REJECTED_TRUST
REJECTED_SCOPE
DUPLICATE_EVENT
QUARANTINED
TEMPORARY_FAILURE
```

Only `TEMPORARY_FAILURE` should be retryable by default. Other statuses require explicit policy review.

## Runtime activation prerequisites

A later implementation phase must define and review these before any runtime code is introduced:

- Local transport strategy.
- Device pairing and trust dependency.
- Event signing model.
- Idempotency and duplicate handling.
- Retry and backoff rules.
- Offline queue durability.
- Receipt storage.
- Operator error surfacing.
- Inventory kill-switch handling.
- No-mutation guarantees.
- Failure-mode testing.

## Explicitly forbidden in Phase 1F

Phase 1F must not add or activate:

- Runtime bridge clients.
- Wi-Fi/IP transport implementation.
- Sync loops.
- Event replay engines.
- Persistence writes beyond documentation.
- Inventory writes.
- Stock movement writes.
- Price mutation.
- POS mutation.
- Order mutation.
- Forecasting mutation.
- Item Master mutation.

## Future phase suggestion

The next implementation-facing phase should be split before runtime behavior appears:

```text
Phase 1G-A: ScanOps outbox schema proposal only
Phase 1G-B: Inventory inbound ledger schema proposal only
Phase 1G-C: Transport contract fixtures only
Phase 1G-D: Local simulation harness only
Phase 1G-E: Runtime behind hard-disabled feature flag
```

Each phase must be separately reviewed and must preserve the ability to stop before activation.

## Acceptance criteria for this document

This design is acceptable only if it remains documentation-only and does not create, import, or invoke runtime bridge behavior.
