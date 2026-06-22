# Phase 2E Runtime Dependency Review

Status: documentation only  
Component: ScanOps

## Purpose

This document records the planned dependency order for future ScanOps bridge work.

No application code, services, entities, workflows, handlers, local stores, persistence, or operational logic are changed in this phase.

## Guardrail summary

This phase is documentation only. It does not permit runtime behavior, transport, replay, outbox processing, local persistence writes, Inventory writes, stock changes, price changes, POS changes, order changes, forecasting changes, or Item Master changes.

## Future dependency order

Future ScanOps bridge work must preserve this order:

```text
Configuration
Safety controls
Local device identity
Target Inventory instance scope
Store/location scope
Schema allow-list
Event-type allow-list
Idempotency check
Capture evidence validation
Local evidence state
Receipt and operator visibility
```

No future component may skip the earlier controls.

## Future component dependencies

| Component | Required upstream control |
| --- | --- |
| BridgeConfigurationService | Default-off local configuration |
| BridgeSafetyControlService | Configuration state |
| DeviceIdentityService | Local device identity |
| CaptureEventBuilder | Device, store, schema, and event controls |
| OutboxValidator | Capture envelope and idempotency controls |
| LocalOutboxService | Validator result and capture-only boundary |
| TransportBoundary | Approved local evidence state |
| ReceiptHandler | Inventory receipt state |
| ReplayCoordinator | Separate retry approval boundary |
| OperatorStatusBoard | Receipt and local evidence state |
| LocalAuditProjection | Governance records |

## Future sequence

Future implementation must be handled through separate reviewed phases. This document does not approve implementation.

## Shutdown sequence

Future shutdown must preserve local evidence, receipt state, and audit history. Re-enable decisions must require owner review.

## Failure containment

Unknown configuration, device, target Inventory instance, store, schema, or event type must fail closed. Duplicate evidence must remain evidence status only. Operator status must not create operational mutation.

## Acceptance criteria

Phase 2E passes only if it remains documentation-only.
