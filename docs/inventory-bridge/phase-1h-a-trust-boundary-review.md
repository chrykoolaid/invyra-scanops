# Phase 1H-A Bridge Trust Boundary Review

Status: review only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Purpose

Phase 1H-A reviews the trust boundary between ScanOps and Inventory before any runtime implementation is considered.

This document is review-only. It does not create runtime bridge code, transport, sync, replay, outbox processing, local persistence writes, Inventory writes, or operational mutation.

## Trust boundary summary

The bridge trust boundary is:

```text
ScanOps capture evidence
  -> future local outbox
  -> future transport boundary
  -> Inventory trust gate
  -> Inventory inbound ledger / quarantine decision
  -> Inventory receipt
  -> ScanOps receipt reconciliation
```

Inventory owns the final trust decision.

ScanOps may prepare evidence in a future phase, but ScanOps must not self-authorize Inventory trust, Inventory writes, or operational outcomes.

## ScanOps-owned claims

ScanOps may provide future claims about:

- Source device identity.
- Source user identity.
- Source session identity.
- Store identity.
- Target Inventory instance identity.
- Event type.
- Event timestamp.
- Sequence number.
- Payload hash.
- Payload signature.
- Idempotency key.

These are claims, not Inventory truth.

## Inventory-owned verification

Inventory must own future verification of:

- Device trust.
- Store scope.
- Inventory instance scope.
- Event type allowance.
- Schema version allowance.
- Receipt generation.
- Quarantine classification.
- Ledger acceptance.
- Operator review requirement.
- Stop-control state.
- Effective runtime enabled state.

## ScanOps trust boundary rules

1. ScanOps evidence is not Inventory truth.
2. A queued event is not a submitted event.
3. A submitted event is not an accepted event.
4. An accepted-to-ledger receipt is not proof of operational Inventory change.
5. ScanOps must not mark an event accepted without a valid Inventory receipt.
6. ScanOps must not infer trust from LAN presence, IP address, or local configuration alone.
7. Stop controls override local readiness.
8. Missing configuration resolves to disabled.
9. Future runtime must remain default-off until separately approved.
10. ScanOps must preserve evidence without claiming Inventory mutation.

## Future local trust prerequisites

A future ScanOps runtime proposal may need local prerequisites such as:

```text
known_source_device_id
known_store_id
known_inventory_instance_id
known_schema_version
stable_event_id
stable_idempotency_key
payload_hash
payload_signature
```

These prerequisites still do not prove Inventory trust.

## Future receipt handling boundary

ScanOps may classify future receipts as:

```text
ACCEPTED_TO_LEDGER
REJECTED_SCHEMA
REJECTED_TRUST
REJECTED_SCOPE
DUPLICATE_EVENT
QUARANTINED
TEMPORARY_FAILURE
```

Receipt handling must not directly mutate Inventory or imply downstream operational change.

## Explicit no-mutation boundary

ScanOps trust review must not directly create or update:

- Inventory stock movements.
- Inventory Item Master records.
- Inventory price records.
- POS sale records.
- Order records.
- Forecast records.
- Posted wastage records.
- Posted store-use records.
- Markdown price activation records.

## Future review questions

Before implementation, the team must answer:

- How does ScanOps learn Inventory instance identity?
- How does ScanOps learn store scope?
- How is device pairing represented locally?
- How are pending events shown to operators?
- How are rejected events surfaced?
- How are quarantined receipts surfaced?
- How are duplicate receipts reconciled?
- How are temporary failures retried?
- How are receipt mismatches handled?
- How does ScanOps respond when Inventory disables bridge processing?

## Acceptance criteria

Phase 1H-A passes only if this remains review documentation and no runtime behavior is implemented.
