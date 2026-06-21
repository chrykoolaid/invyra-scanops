# Invyra ScanOps Bridge Phase 1G-B Outbox Validation Rules

Status: validation rules proposal only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Phase: `1G-B`  
Runtime state: not implemented and not activated

## Purpose

This document proposes the validation rules that a future ScanOps outbox should apply before evidence events become eligible for bridge submission.

It is documentation only. It does not implement validation code, event transport, sync, event replay, persistence writes, or Inventory writes.

## Validation order

A future implementation should validate outbox records in a strict order:

```text
1. Feature flag / local bridge disabled check
2. Capture envelope shape
3. Required fields
4. Schema version
5. Evidence event type
6. Store and Inventory instance scope
7. Device identity and local trust prerequisites
8. Payload hash generation
9. Payload signature generation
10. Sequence and idempotency generation
11. Queue eligibility
12. Retry eligibility
13. Receipt reconciliation
14. Operator-action classification
```

A failure at any step should keep the record local and non-operational.

## Rule 1 — Feature flag / local disabled check

If bridge runtime is disabled, ScanOps must not submit evidence to Inventory.

Future result:

```text
status: QUEUED or WAITING_FOR_TRUST
submission_allowed: false
operator_action_required: false unless policy requires notice
```

Missing configuration must default to disabled.

## Rule 2 — Capture envelope shape

The outbox event envelope must be an object with known top-level fields.

Malformed capture records must not become eligible for future submission.

Future result:

```text
status: OPERATOR_ACTION_REQUIRED
last_error_code: INVALID_CAPTURE_ENVELOPE
```

## Rule 3 — Required fields

The following fields should be required before a future outbox record can be queued:

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
idempotency_key
payload_hash
payload_signature
payload
```

Missing fields must block submission eligibility.

## Rule 4 — Schema version

Unsupported schema versions must not be submitted.

ScanOps should not guess compatibility with Inventory.

Future result:

```text
status: OPERATOR_ACTION_REQUIRED
last_error_code: SCHEMA_VERSION_UNSUPPORTED
```

## Rule 5 — Evidence event type

Unsupported event types must not be queued for bridge submission.

Future evidence-only event types:

```text
SCANOPS_FLOOR_GAP_EVIDENCE
SCANOPS_WASTAGE_EVIDENCE
SCANOPS_STORE_USE_EVIDENCE
SCANOPS_SCANNER_INTAKE_EVIDENCE
SCANOPS_MARKDOWN_EVIDENCE
```

No event type may directly mutate Inventory operational records.

## Rule 6 — Store and Inventory instance scope

ScanOps must not submit an event unless the target store and Inventory instance are known.

Unknown or ambiguous scope must block submission.

Future result:

```text
status: WAITING_FOR_TRUST or OPERATOR_ACTION_REQUIRED
last_error_code: INVENTORY_SCOPE_UNKNOWN
```

## Rule 7 — Device identity and local trust prerequisites

ScanOps must not self-authorize Inventory trust.

A future local outbox may know device identity, but Inventory remains responsible for trust acceptance.

If local pairing evidence is missing, the record must not submit.

Future result:

```text
status: WAITING_FOR_TRUST
last_error_code: DEVICE_PAIRING_REQUIRED
```

## Rule 8 — Payload hash generation

ScanOps must generate a stable payload hash before submission.

If the payload changes after hashing, a future implementation must reject the local record or generate a new event according to policy.

## Rule 9 — Payload signature generation

ScanOps must not submit unsigned evidence in a future runtime implementation.

Signature policy must be defined in a later transport contract phase.

## Rule 10 — Sequence and idempotency generation

Every future outbox record must have a stable `event_id`, `sequence_number`, and `idempotency_key`.

Retries must reuse the same event identity and idempotency key.

Retrying with new IDs must be forbidden unless a later explicit policy defines a safe replacement-event process.

## Rule 11 — Queue eligibility

A record may become `QUEUED` only after required fields, scope, event type, payload hash, signature, and local prerequisites are satisfied.

Queued does not mean submitted or accepted.

## Rule 12 — Retry eligibility

Only transport failures and Inventory `TEMPORARY_FAILURE` receipts should be retryable by default.

Do not automatically retry:

```text
REJECTED_SCHEMA
REJECTED_TRUST
REJECTED_SCOPE
DUPLICATE_EVENT
QUARANTINED
```

## Rule 13 — Receipt reconciliation

ScanOps must update local receipt metadata only after receiving a valid Inventory receipt.

A receipt must match the original `event_id` and idempotency key.

Receipt mismatch must require operator action or quarantine-local handling.

## Rule 14 — Operator-action classification

ScanOps should mark records as operator-action-required when:

- Capture data is malformed.
- Required scope is missing.
- Device pairing or trust is missing.
- Inventory rejects schema.
- Inventory rejects trust.
- Inventory rejects scope.
- Inventory quarantines the event.
- Receipt mismatch occurs.

## Forbidden validation shortcuts

Future implementation must not:

- Submit events when the feature flag is missing.
- Submit events based on LAN discovery alone.
- Trust Inventory scope from operator free text alone.
- Auto-create Inventory trust from ScanOps state.
- Regenerate event IDs on retry.
- Mark events accepted without a receipt.
- Auto-post stock movements from outbox records.
- Auto-approve wastage or store-use from outbox records.
- Auto-change prices from markdown evidence.
- Auto-change Item Master data.

## Acceptance criteria

Phase 1G-B passes only if these rules remain documentation-only and no outbox runtime is implemented.
