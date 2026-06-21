# Invyra ScanOps Bridge Phase 1G-B Outbox Schema Proposal

Status: schema proposal only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Phase: `1G-B`  
Runtime state: not implemented and not activated

## Purpose

Phase 1G-B proposes the future ScanOps-side outbound outbox schema for bridge evidence events.

This document is not a runtime implementation. It must not create an IndexedDB store, Base44 entity, service, transport client, sync loop, replay engine, or persistence write path.

The purpose is to define the shape, ownership, retry boundary, receipt boundary, and safety expectations for a later explicit implementation phase.

## Design principle

ScanOps remains capture-first.

A ScanOps outbox record is future evidence prepared for submission to Inventory. It is not proof that Inventory accepted the event and it must never imply that Inventory stock, price, POS, order, forecasting, or Item Master state changed.

Inventory remains the source of truth.

## Proposed future store name

Future ScanOps-side local outbox store name:

```text
scanops_inventory_bridge_outbox
```

This is a proposed name only. It is not created in Phase 1G-B.

## Proposed record purpose

An outbox record represents one ScanOps evidence event prepared for future bridge submission.

The record is a local, durable, retry-aware capture artifact. It is not a transport action, Inventory receipt, stock movement, price change, POS action, order action, forecast action, or Item Master action.

## Proposed top-level fields

```text
outbox_record_id
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
queued_at
last_attempted_at
submitted_at
sequence_number
idempotency_key
payload_hash
payload_signature
payload
status
attempt_count
next_retry_at
retry_after_ms
last_error_code
last_error_message
receipt_id
receipt_status
receipt_reason_code
receipt_received_at
inventory_ledger_reference
operator_action_required
created_by
updated_at
```

## Field intent

| Field | Intent |
| --- | --- |
| `outbox_record_id` | ScanOps-owned immutable local outbox identifier. |
| `event_id` | Stable event identifier sent to Inventory. |
| `schema_version` | Event contract version. |
| `event_type` | Evidence type such as floor gap, wastage evidence, store-use evidence, scanner intake evidence, or markdown evidence. |
| `source_system` | Expected to identify ScanOps. |
| `source_device_id` | Scanner or ScanOps device identifier. |
| `source_session_id` | Capture session identifier. |
| `source_user_id` | Operator identity captured by ScanOps. |
| `store_id` | Store/location boundary. |
| `inventory_instance_id` | Target Inventory instance boundary. |
| `occurred_at` | When the evidence was captured. |
| `created_at` | When ScanOps created the outbox record. |
| `queued_at` | When the record became eligible for future submission. |
| `last_attempted_at` | Most recent future submission attempt time. |
| `submitted_at` | Most recent submitted-at timestamp. |
| `sequence_number` | Device/session ordering evidence. |
| `idempotency_key` | Duplicate detection key shared with Inventory. |
| `payload_hash` | Hash of payload content. |
| `payload_signature` | Signature covering payload and key metadata in a future implementation. |
| `payload` | Immutable evidence payload. |
| `status` | ScanOps-side outbox handling status. |
| `attempt_count` | Number of future submission attempts. |
| `next_retry_at` | Retry scheduling timestamp. |
| `retry_after_ms` | Backoff duration. |
| `last_error_code` | Latest local transport or receipt error code. |
| `last_error_message` | Operator-safe explanation of the latest failure. |
| `receipt_id` | Inventory receipt identifier, once received. |
| `receipt_status` | Inventory receipt outcome. |
| `receipt_reason_code` | Inventory receipt reason code. |
| `receipt_received_at` | When ScanOps received the receipt. |
| `inventory_ledger_reference` | Inventory ledger reference from receipt, if provided. |
| `operator_action_required` | Whether operator intervention is needed. |
| `created_by` | ScanOps user/system actor that created the local record. |
| `updated_at` | Last local metadata update timestamp. |

## Proposed ScanOps outbox statuses

```text
DRAFT_CAPTURED
QUEUED
WAITING_FOR_TRUST
SUBMITTING
SUBMITTED_AWAITING_RECEIPT
ACCEPTED_TO_INVENTORY_LEDGER
REJECTED_BY_INVENTORY
DUPLICATE_CONFIRMED
QUARANTINED_BY_INVENTORY
TEMPORARY_FAILURE
RETRY_SCHEDULED
OPERATOR_ACTION_REQUIRED
CANCELLED_LOCAL_ONLY
```

## Proposed event types

Initial future event types should remain evidence-only:

```text
SCANOPS_FLOOR_GAP_EVIDENCE
SCANOPS_WASTAGE_EVIDENCE
SCANOPS_STORE_USE_EVIDENCE
SCANOPS_SCANNER_INTAKE_EVIDENCE
SCANOPS_MARKDOWN_EVIDENCE
```

These event types must not directly post stock movements or mutate Inventory operational records.

## Proposed receipt statuses tracked by ScanOps

ScanOps should store Inventory receipt outcomes distinctly:

```text
ACCEPTED_TO_LEDGER
REJECTED_SCHEMA
REJECTED_TRUST
REJECTED_SCOPE
DUPLICATE_EVENT
QUARANTINED
TEMPORARY_FAILURE
```

ScanOps must not infer acceptance without a valid Inventory receipt.

## Immutability rules

The evidence payload and identity fields should be immutable after an outbox record is queued.

Immutable fields should include:

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
sequence_number
idempotency_key
payload_hash
payload_signature
payload
```

Permitted future changes should be limited to local handling metadata, retry metadata, and receipt metadata.

## Retry rules

Future retry behavior must be conservative.

Only transport failures and explicit Inventory `TEMPORARY_FAILURE` receipts should be retryable by default.

The following should not retry automatically:

```text
REJECTED_SCHEMA
REJECTED_TRUST
REJECTED_SCOPE
DUPLICATE_EVENT
QUARANTINED
```

## Receipt boundary

A sent event is not complete until Inventory returns a valid receipt.

A receipt does not mean Inventory operational state changed. It means Inventory classified the evidence submission.

ScanOps must surface receipt outcomes to the operator or review queue without claiming operational mutation.

## No-mutation boundary

The outbox must not be treated as a mutation engine.

Future outbox processing must not directly create or update:

- Inventory stock movements.
- Inventory Item Master records.
- Inventory price records.
- POS sale records.
- Order records.
- Forecast records.
- Posted wastage records.
- Posted store-use records.
- Markdown price activation records.

## Offline-first boundary

The future outbox may support offline-first queueing, but offline queueing must not bypass Inventory trust, validation, receipt, or kill-switch behavior.

When Inventory is unavailable, records may remain queued or retry-scheduled. They must not be marked accepted.

## Future implementation prerequisites

Before creating any outbox store or write path, a later phase must define:

- Exact IndexedDB or local storage schema.
- Retention policy.
- Encryption or local protection model.
- Retry and backoff policy.
- Receipt reconciliation model.
- Operator action model.
- Feature flag default-off behavior.
- Inventory kill-switch handling.
- Failure-mode tests.

## Explicitly forbidden in Phase 1G-B

Phase 1G-B must not add or activate:

- IndexedDB stores.
- Local persistence writes.
- Base44 entities.
- Services.
- Transport clients.
- Sync loops.
- Event replay.
- Runtime bridge clients.
- Inventory writes.
- Stock movement writes.
- Price, POS, order, forecasting, or Item Master mutation.

## Acceptance criteria

Phase 1G-B passes only if this remains a schema proposal document and no runtime or persistence behavior is implemented.
