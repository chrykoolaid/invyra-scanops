# Phase 1H-C Bridge Failure Matrix Review

Status: review only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Purpose

Phase 1H-C reviews future failure modes for the ScanOps <-> Inventory Bridge from the ScanOps side.

This is documentation only. It does not implement runtime bridge code, transport, sync, replay, outbox processing, local persistence writes, Inventory writes, or operational mutation.

## Failure matrix overview

Future ScanOps behavior must assume that capture, queueing, submission, and receipt reconciliation can fail safely:

```text
ScanOps capture
  -> local evidence preparation
  -> future outbox queue
  -> future transport attempt
  -> submitted awaiting receipt
  -> Inventory receipt classification
  -> local reconciliation
```

Every failure must preserve Inventory as source of truth and must not create direct operational mutation.

## ScanOps-side failure matrix

| Failure mode | Future ScanOps response | Retry allowed | Operator action | Inventory mutation allowed |
| --- | --- | --- | --- | --- |
| Bridge disabled locally | Keep local only or defer | No by default | Optional notice | No |
| Inventory disabled state | Defer submission | No by default | Optional notice | No |
| Device not paired | Waiting for trust | No | Yes | No |
| Store scope missing | Operator action required | No | Yes | No |
| Inventory instance missing | Operator action required | No | Yes | No |
| Unsupported event type | Refuse queue eligibility | No | Yes | No |
| Missing required field | Operator action required | No | Yes | No |
| Missing idempotency key | Refuse submission eligibility | No | Yes | No |
| Payload hash unavailable | Refuse submission eligibility | No | Yes | No |
| Signature unavailable | Refuse submission eligibility | No | Yes | No |
| Transport unavailable | Retry scheduled by policy | Yes by policy | Optional | No |
| Submitted but no receipt | Pending or retry by policy | Yes by policy | Optional | No |
| Receipt event mismatch | Operator action required | No | Yes | No |
| Rejected schema receipt | Rejected locally | No | Yes | No |
| Rejected trust receipt | Rejected locally | No | Yes | No |
| Rejected scope receipt | Rejected locally | No | Yes | No |
| Duplicate receipt | Duplicate confirmed | No | Optional | No |
| Quarantine receipt | Operator action required | No | Yes | No |
| Temporary failure receipt | Retry scheduled | Yes by policy | Optional | No |

## Required failure principles

1. Failure must be visible locally.
2. Failure must not be treated as Inventory acceptance.
3. Failure must not silently retry unless policy allows it.
4. Failure must preserve stable event identity.
5. Failure must not regenerate event ids automatically.
6. Failure must not mark local evidence as accepted without a valid Inventory receipt.
7. Failure must not create Inventory stock movements.
8. Failure must not change Inventory prices, POS behavior, orders, forecasts, or Item Master data.
9. Failure must remain auditable.
10. Failure must be recoverable where policy allows.

## Receipt expectations for failures

Future failure receipts from Inventory may include:

```text
REJECTED_SCHEMA
REJECTED_TRUST
REJECTED_SCOPE
DUPLICATE_EVENT
QUARANTINED
TEMPORARY_FAILURE
```

ScanOps must classify each receipt without assuming downstream operational change.

## Retry expectations

Retry should be conservative.

Only transport failures, missing receipts under policy, and Inventory `TEMPORARY_FAILURE` receipts should be retryable by default.

Trust failures, schema failures, scope failures, duplicate events, and quarantined events should not auto-retry without a later explicit policy.

## Operator visibility expectations

A future implementation should make these visible to operators:

- waiting for trust;
- store scope missing;
- Inventory instance missing;
- rejected schema;
- rejected trust;
- rejected scope;
- quarantine receipt;
- repeated temporary failure;
- receipt mismatch.

## Audit expectations

A future implementation must audit or preserve locally:

- failure status;
- reason code;
- source event id;
- source device id;
- store scope;
- Inventory instance scope;
- receipt id where available;
- operator action requirement;
- retry eligibility;
- classification timestamp.

## Future implementation questions

Before implementation, the team must answer:

- Which local failures are operator-visible?
- Which local failures are admin-visible only?
- Which temporary failures are retryable?
- How is retry backoff defined?
- How are missing receipts handled?
- How are duplicate receipts linked to original events?
- How long are failed local events retained?
- How are repeated failures surfaced to administrators?

## Acceptance criteria

Phase 1H-C passes only if this remains failure matrix review documentation and no runtime behavior is implemented.
