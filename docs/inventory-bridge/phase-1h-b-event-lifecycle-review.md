# Phase 1H-B Bridge Event Lifecycle Review

Status: review only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Purpose

Phase 1H-B reviews the future event lifecycle for the ScanOps <-> Inventory Bridge from the ScanOps side.

This is documentation only. It does not implement runtime bridge code, transport, sync, replay, outbox processing, local persistence writes, Inventory writes, or operational mutation.

## Lifecycle overview

The future ScanOps bridge event lifecycle should remain capture-first and receipt-aware:

```text
Captured in ScanOps
  -> prepared as evidence
  -> queued in future outbox
  -> future transport attempt
  -> submitted awaiting receipt
  -> receipt received from Inventory
  -> reconciled locally
  -> accepted, rejected, duplicate, quarantined, deferred, or operator-action-required locally
```

ScanOps must not assume that a submitted event changed Inventory state.

## ScanOps lifecycle states

ScanOps may use future local states such as:

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
ARCHIVED_LOCAL_ONLY
```

These states classify local evidence and receipt handling. They do not directly create Inventory stock, price, POS, order, forecast, or Item Master changes.

## ScanOps lifecycle responsibilities

ScanOps is responsible for future decisions around:

- Whether the evidence is complete enough to queue.
- Whether local trust prerequisites are present.
- Whether the event has stable identity and idempotency key.
- Whether payload hash and signature fields are present.
- Whether the event is awaiting Inventory receipt.
- Whether a receipt matches the submitted event.
- Whether a receipt outcome should schedule retry.
- Whether operator action is required.
- Whether local-only cancellation is allowed.
- Whether local archival is allowed.

## Transition review

| Transition | ScanOps review requirement | Inventory mutation allowed |
| --- | --- | --- |
| Draft captured -> Queued | Required fields and local scope present | No |
| Queued -> Submitted awaiting receipt | Future runtime gate and Inventory permission effective | No |
| Submitted awaiting receipt -> Accepted to Inventory ledger | Valid Inventory receipt | No direct mutation |
| Submitted awaiting receipt -> Rejected | Valid rejection receipt | No |
| Submitted awaiting receipt -> Duplicate confirmed | Valid duplicate receipt | No |
| Submitted awaiting receipt -> Quarantined | Valid quarantine receipt | No |
| Temporary failure -> Retry scheduled | Retry allowed by policy | No |
| Any state -> Archived local only | Retention policy only | No |

## Receipt lifecycle

ScanOps must not mark an event complete without a valid Inventory receipt.

Receipt outcomes may include:

```text
ACCEPTED_TO_LEDGER
REJECTED_SCHEMA
REJECTED_TRUST
REJECTED_SCOPE
DUPLICATE_EVENT
QUARANTINED
TEMPORARY_FAILURE
```

A receipt must not be treated as proof of operational Inventory mutation.

## Archive boundary

Local archival should be a retention and audit action only.

Archiving must not imply Inventory acceptance or operational change.

## No-mutation lifecycle rule

The ScanOps bridge event lifecycle must not directly mutate:

- Inventory stock movements.
- Inventory Item Master records.
- Inventory price records.
- POS sale records.
- Order records.
- Forecast records.
- Posted wastage records.
- Posted store-use records.
- Markdown price activation records.

## Future implementation questions

Before implementation, the team must answer:

- Which local states are immutable?
- Which local metadata fields can be updated after queueing?
- How is retry scheduling displayed?
- How are rejected receipts surfaced?
- How are quarantine receipts surfaced?
- How are duplicate receipts linked to original events?
- How are pending events handled when Inventory is disabled?
- Who can cancel local-only events?
- Who can archive local evidence?
- How are archived records audited?

## Acceptance criteria

Phase 1H-B passes only if this remains event lifecycle review documentation and no runtime behavior is implemented.
