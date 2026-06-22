# Phase 2D Disabled Runtime Component Mapping

Status: architecture mapping only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Purpose

Phase 2D maps future ScanOps-side bridge runtime components without implementing them.

The goal is to define component ownership, dependency boundaries, failure containment, and kill-switch interactions before any disabled scaffolding is considered.

## Non-negotiable guardrails

Phase 2D remains documentation-only:

```text
runtime_activation_allowed=false
transport_allowed=false
sync_allowed=false
replay_allowed=false
outbox_processing_allowed=false
local_persistence_write_allowed=false
inventory_write_allowed=false
stock_mutation_allowed=false
price_mutation_allowed=false
pos_mutation_allowed=false
order_mutation_allowed=false
forecasting_mutation_allowed=false
item_master_mutation_allowed=false
```

## Future ScanOps component map

Future ScanOps-side bridge runtime may be separated into these disabled components:

```text
BridgeConfigurationService
DeviceIdentityService
CaptureEventBuilder
LocalOutboxService
OutboxValidator
TransportBoundary
ReceiptHandler
ReplayCoordinator
OperatorStatusBoard
BridgeKillSwitchService
LocalAuditProjection
```

These are proposed logical components only. Phase 2D does not create files, services, entities, local stores, handlers, or runtime code.

## Component responsibility map

| Component | Future responsibility | Must not do |
| --- | --- | --- |
| `BridgeConfigurationService` | Read default-off local bridge settings | Enable runtime by default |
| `DeviceIdentityService` | Represent local device identity | Self-authorize Inventory trust |
| `CaptureEventBuilder` | Prepare capture-only evidence envelopes | Create Inventory operations |
| `LocalOutboxService` | Hold evidence state if later approved | Act as Inventory ledger |
| `OutboxValidator` | Validate local envelope, schema, scope, idempotency | Send invalid evidence as trusted |
| `TransportBoundary` | Define future transport edge | Start transport without approval |
| `ReceiptHandler` | Reconcile Inventory receipt states | Convert receipt into mutation |
| `ReplayCoordinator` | Coordinate controlled retry if later approved | Replay without separate approval |
| `OperatorStatusBoard` | Show capture and receipt state | Present evidence as Inventory update |
| `BridgeKillSwitchService` | Disable bridge activity by scope | Delete evidence or audit history |
| `LocalAuditProjection` | Project local governance/audit history | Hide configuration or trust changes |

## Dependency map

Future dependencies must flow in a safe order:

```text
BridgeConfigurationService
  -> BridgeKillSwitchService
  -> DeviceIdentityService
  -> CaptureEventBuilder
  -> OutboxValidator
  -> LocalOutboxService
  -> TransportBoundary
  -> ReceiptHandler
  -> ReplayCoordinator
  -> OperatorStatusBoard
  -> LocalAuditProjection
```

No component may bypass configuration, kill-switch, device identity, or validation boundaries.

## Activation sequence map

A future activation sequence must remain split across later phases:

```text
configuration schema exists disabled
component stubs exist disabled
validator-only fixture simulation
local outbox disabled prototype
receipt display-only prototype
operator status display only
transport disabled prototype
replay disabled prototype
internal pilot proposal
```

Phase 2D authorizes none of these steps.

## Failure containment boundaries

Future components must fail closed:

- Missing configuration disables all components.
- Kill-switch state disables affected scope.
- Missing local device identity blocks evidence submission.
- Unknown target Inventory instance blocks evidence submission.
- Unknown store/location blocks or locally invalidates evidence.
- Unsupported schema blocks or locally invalidates evidence.
- Unsupported event type blocks or locally invalidates evidence.
- Duplicate or replayed event returns evidence handling status only.
- Receipt mismatch must not create operational correction.
- Operator status cannot imply Inventory mutation.

## Kill-switch interaction map

Required kill-switch scopes:

```text
global bridge disable
local ScanOps bridge disable
transport disable
outbox processing disable
replay disable
store/location disable
device disable
event-type disable
schema-version disable
trust disable
```

Kill-switch evaluation must occur before capture envelope build proposals, local outbox processing proposals, transport proposals, replay proposals, receipt handling, and operator status actions.

## Cross-system ownership boundary

ScanOps owns:

- Capture-side evidence creation.
- Local device identity representation.
- Local operator visibility.
- Local disabled-state representation.
- Local capture-side validation.

Inventory owns:

- Target Inventory instance authority.
- Device trust acceptance.
- Store/location acceptance.
- Inbound validation authority.
- Quarantine governance.
- Receipt semantics.
- Disable authority.
- Final No-Go decisions.

ScanOps must not self-authorize Inventory trust.

## Explicit non-authorization

This document does not authorize runtime code, local store creation, service creation, transport, sync, replay, outbox processing, local persistence writes, Inventory writes, or operational mutation.

## Acceptance criteria

Phase 2D passes only if it remains component mapping documentation and no runtime behavior is implemented or activated.
