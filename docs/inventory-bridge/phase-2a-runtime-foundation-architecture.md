# Phase 2A Runtime Foundation Architecture

Status: architecture/specification only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Purpose

Phase 2A starts the ScanOps-side bridge runtime foundation architecture for the future ScanOps ↔ Inventory bridge, while keeping all runtime behavior disabled and unimplemented.

This phase defines ScanOps-side boundaries for future runtime components. It does not add bridge runtime code, transport, sync, replay, outbox processing, local persistence writes, Inventory writes, or operational mutation.

## Non-negotiable guardrails

The default outcome of Phase 2A is still:

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

## Architecture scope

Phase 2A may define the following future-runtime architecture areas:

- Event contract boundaries.
- Runtime component boundaries.
- Configuration model.
- Trust model implementation design.
- Device identity model.
- Local outbox architecture.
- Receipt reconciliation architecture.
- Operator visibility architecture.
- Kill-switch architecture.
- Future activation sequence.

Phase 2A must not implement any of these areas.

## Event contract boundary

Future ScanOps runtime must prepare evidence envelopes only.

An event envelope may be designed to include:

```text
event_id
idempotency_key
schema_version
event_type
device_id
store_id
target_inventory_instance_id
capture_timestamp
payload_hash
signature_reference
payload_reference
source_system
operator_reference
```

ScanOps must not treat a prepared, queued, submitted, retried, transported, or receipted event as an Inventory stock movement, price change, POS transaction, order action, forecasting update, or Item Master update.

## Runtime component boundary

Future ScanOps-side bridge runtime should be split into separately reviewable components:

```text
BridgeConfiguration
DeviceIdentityProvider
CaptureEventBuilder
LocalOutbox
OutboxValidator
TransportBoundary
ReceiptReconciler
OperatorVisibilitySurface
BridgeKillSwitch
LocalAuditProjection
```

Each component must remain disabled until a later approved implementation phase.

No component may self-authorize Inventory trust.

## Configuration model

The future configuration model must be default-off and explicit.

Required configuration boundaries:

```text
bridge_enabled=false
transport_enabled=false
replay_enabled=false
outbox_processing_enabled=false
accepted_schema_versions=[]
accepted_event_types=[]
local_device_id=null
allowed_store_ids=[]
target_inventory_instance_id=null
```

Missing, empty, invalid, or partial configuration must evaluate to disabled.

## Trust model implementation design

Inventory must own final trust authority.

Future ScanOps-side checks should require:

- Known local device identity.
- Known store/location scope.
- Known target Inventory instance.
- Accepted schema version.
- Accepted event type.
- Stable idempotency key.
- Payload integrity reference.
- Non-mutating capture boundary.

A failed local check must block submission or mark evidence locally invalid. It must not imply Inventory mutation.

## Device identity model

Future device identity must be compatible with Inventory-owned trust.

A local device identity may include:

```text
device_id
pairing_reference
store_scope
allowed_event_types
local_status
last_seen_reference
disabled_at
disabled_reason
```

ScanOps may represent device identity locally, but Inventory must own final trust acceptance.

## Local outbox architecture

Future outbox design, if later approved, must be capture-only and default-disabled.

The local outbox may support:

- Pending status.
- Locally invalid status.
- Submitted status.
- Receipt pending status.
- Rejected status.
- Quarantined by Inventory status.
- Duplicate status.
- Mismatch status.

The local outbox must not be an Inventory ledger and must not imply stock, price, POS, order, forecasting, or Item Master mutation.

## Receipt reconciliation architecture

Future receipt reconciliation must describe Inventory evidence handling only.

Receipt states may include:

```text
received
accepted_as_evidence
rejected
quarantined
duplicate
schema_unsupported
trust_failed
integrity_failed
ignored
mismatch
```

ScanOps must not convert a receipt into an operational Inventory outcome.

## Operator visibility architecture

Future operator visibility must distinguish capture state from Inventory operational state.

Operators may see:

- Pending local evidence.
- Locally invalid evidence.
- Submitted evidence.
- Receipt pending evidence.
- Rejected evidence.
- Quarantined evidence.
- Duplicate evidence.
- Mismatch evidence.

Operator visibility must not present bridge evidence as a stock update, price update, POS update, order update, forecasting update, or Item Master update.

## Kill-switch architecture

Future runtime must be disable-first.

Required kill-switch scopes:

```text
global bridge disable
local ScanOps bridge disable
transport disable
outbox processing disable
store/location disable
device disable
event-type disable
schema-version disable
trust disable
```

A kill-switch action must stop future bridge activity and preserve evidence/audit history.

## Future activation sequence

Phase 2A does not approve activation.

A future activation path must be split into separate phases:

```text
2B configuration schema proposal only
2C disabled local outbox/entity schema implementation
2D validator-only implementation
2E local fixture simulation only
2F transport prototype behind disabled state
2G receipt reconciliation prototype behind disabled state
2H operator visibility prototype behind disabled state
2I internal pilot activation proposal
```

Each phase must be separately reviewed and approved.

## Explicit non-authorization

This document does not authorize:

- Runtime bridge activation.
- Transport implementation.
- Sync implementation.
- Replay implementation.
- Outbox processing.
- Local persistence writes.
- Inventory writes.
- Stock mutation.
- Price mutation.
- POS mutation.
- Order mutation.
- Forecasting mutation.
- Item Master mutation.

## Acceptance criteria

Phase 2A passes only if it remains architecture/specification documentation and no runtime behavior is implemented or activated.
