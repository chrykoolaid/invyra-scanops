# Invyra ScanOps Bridge Phase 1G-C Transport Contract Fixtures

Status: static contract fixtures only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Phase: `1G-C`  
Runtime state: not implemented and not activated

## Purpose

Phase 1G-C adds static contract fixtures that describe the future ScanOps outbound event and Inventory receipt shapes.

These fixtures are not executable code. They do not create an outbox store, transport client, listener, endpoint, sync loop, event replay path, persistence write, or Inventory mutation.

## Added fixture files

```text
docs/inventory-bridge/fixtures/phase-1g-c/outbox-event.floor-gap.example.json
docs/inventory-bridge/fixtures/phase-1g-c/receipt.accepted-to-ledger.example.json
docs/inventory-bridge/fixtures/phase-1g-c/receipt.temporary-failure.example.json
```

## Contract direction

The future bridge contract remains evidence-first:

```text
ScanOps evidence event
  -> future ScanOps local outbox
  -> future local transport
  -> Inventory inbound ledger validation
  -> Inventory receipt
  -> ScanOps receipt reconciliation
```

The fixtures describe payload shape only. They do not authorize runtime behavior.

## ScanOps fixture responsibilities

The ScanOps-side fixtures demonstrate:

- A future local outbox event prepared by ScanOps.
- A future accepted-to-ledger receipt from Inventory.
- A future temporary-failure receipt from Inventory.
- Stable event identity.
- Idempotency key usage.
- Payload hash field usage.
- Signature placeholder usage.
- Receipt reconciliation fields.
- Non-operational fixture warnings.

## Fixture safety rules

All fixture signatures, hashes, IDs, outbox references, and receipt references are examples only.

They must not be treated as valid runtime secrets, real cryptographic material, real device identifiers, real store identifiers, or live Inventory references.

## Explicitly forbidden in Phase 1G-C

Phase 1G-C must not add or activate:

- Runtime bridge activation.
- Wi-Fi/IP transport implementation.
- HTTP/WebSocket/local-network clients.
- Sync loops.
- Event replay engines.
- IndexedDB stores.
- Local persistence writes.
- Inventory writes.
- Stock movement writes.
- Price, POS, order, forecasting, or Item Master mutation.

## Future implementation boundary

A later implementation phase must separately define:

- Exact transport protocol.
- Auth handshake.
- Signing and verification algorithm.
- Payload hash algorithm.
- Replay prevention.
- Retry policy.
- Receipt delivery.
- Receipt reconciliation.
- Failure-mode tests.
- Feature flag default-off behavior.
- Inventory kill-switch behavior.

## Acceptance criteria

Phase 1G-C passes only if it remains static documentation and fixture data with no runtime behavior.
