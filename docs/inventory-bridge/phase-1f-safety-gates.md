# Invyra ScanOps Bridge Phase 1F Safety Gates

Status: specification only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Purpose

This document defines the ScanOps-side safety gates that must exist before any future ScanOps <-> Inventory Bridge runtime activation work can proceed.

It is not an implementation checklist for live runtime behavior. It is a stop/go specification for later phases.

## Gate 0 — Non-operational baseline

Before future work begins, both repos must still pass their stack validators from fresh `main`:

```powershell
node .\scripts\validate-inventory-bridge-stack.mjs
node .\scripts\validate-scanops-inventory-bridge-stack.mjs
```

Required result:

```text
Inventory bridge stack validation PASS
ScanOps bridge stack validation PASS
```

## Gate 1 — Feature flag default-off

Any future runtime bridge code must be guarded by a hard-disabled feature flag or equivalent configuration gate.

Default state:

```text
bridge_runtime_enabled=false
```

A missing, malformed, or unavailable configuration value must resolve to disabled.

## Gate 2 — Inventory trust required

ScanOps must not assume it is trusted. It must respect Inventory-owned pairing and trust decisions.

A ScanOps device must not self-authorize bridge submission.

## Gate 3 — Signed event envelope required

ScanOps must not submit unsigned or malformed evidence events in a future runtime implementation.

The signature and payload hash must cover the submitted payload and event metadata.

## Gate 4 — Outbox before transport

Future ScanOps bridge events must be written to a local outbox before transport.

Outbox records must support offline-first operation, retry safety, receipt reconciliation, and audit traceability.

## Gate 5 — Receipt before completion

ScanOps must not mark an event as completed until Inventory returns a valid receipt.

A sent event without a receipt is not accepted. It remains pending, retryable, or operator-action-required depending on policy.

## Gate 6 — No operational assumptions

ScanOps must not display or behave as if Inventory stock, price, POS, order, forecast, or Item Master data changed merely because an event was sent.

Only Inventory receipts and later Inventory workflow state may prove the downstream outcome.

## Gate 7 — Kill switch respected

If Inventory indicates bridge runtime is disabled, ScanOps must stop submission attempts and keep events local according to the defined queue policy.

Kill-switch behavior must be visible to operators.

## Gate 8 — No silent discovery activation

The bridge must not silently activate because a LAN peer is discovered, an IP address is configured, a device is online, or a default port is available.

Manual administrative activation must be explicit, audited, and reversible.

## Gate 9 — Failure-mode tests required

Before runtime activation, tests must cover:

- Duplicate event.
- Stale event.
- Out-of-order event.
- Unknown device.
- Disabled feature flag.
- Bad signature.
- Payload tampering.
- Network retry.
- Inventory offline.
- ScanOps offline.
- Receipt loss.
- Quarantine receipt.
- Operator-action-required receipt.

## Gate 10 — Commercial safety review

Before activation, the bridge must pass a product-level safety review for retail operations.

The review must confirm that handheld scanner behavior cannot unexpectedly change stock, prices, POS sale behavior, orders, forecasts, or Item Master data.

## Phase 1F acceptance

Phase 1F passes only if these gates are documented without implementing runtime bridge behavior.
