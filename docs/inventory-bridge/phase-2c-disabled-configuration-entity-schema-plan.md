# Phase 2C Disabled Configuration Entity / Schema Implementation Plan

Status: implementation planning only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Purpose

Phase 2C defines the ScanOps-side plan for a future disabled local configuration schema. This is not the implementation itself.

The goal is to prepare a safe, default-off shape for later local settings storage without enabling bridge runtime behavior.

## Non-negotiable guardrails

Phase 2C remains documentation/specification only:

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

## Proposed future schema purpose

A future ScanOps-owned local configuration schema may store only default-off bridge settings and operator-visible governance state.

It must not store Inventory operational records.

It must not activate runtime by existing.

## Proposed future schema name

Suggested name:

```text
ScanOpsBridgeConfiguration
```

This name is a proposal only. It does not create an entity, IndexedDB store, or local persistence layer in this phase.

## Proposed future fields

A future disabled schema may include:

```text
id
environment
bridge_enabled
transport_enabled
outbox_processing_enabled
replay_enabled
local_device_id
target_inventory_instance_id
accepted_schema_versions
accepted_event_types
allowed_store_ids
kill_switches
operator_visibility_required
created_by
updated_by
created_at
updated_at
last_reviewed_by
last_reviewed_at
```

All runtime flags must default to `false`.

## Required defaults

```text
bridge_enabled=false
transport_enabled=false
outbox_processing_enabled=false
replay_enabled=false
local_device_id=null
target_inventory_instance_id=null
accepted_schema_versions=[]
accepted_event_types=[]
allowed_store_ids=[]
kill_switches.global_disabled=true
operator_visibility_required=true
```

Missing configuration must equal disabled configuration.

## Validation design

Future validation must fail closed when:

- Environment is unknown.
- Local device identity is missing.
- Target Inventory instance identity is missing.
- Any runtime flag is not explicitly boolean.
- Any allow-list is malformed.
- Store/location scope is missing.
- Event type is unsupported.
- Schema version is unsupported.
- Kill-switch state is ambiguous.

Failure must produce disabled, locally invalid, rejected, or quarantined governance state only.

## Event allow-list alignment

The accepted event type allow-list must use the existing ScanOps event identifiers:

```text
SCANOPS_FLOOR_GAP_EVIDENCE
SCANOPS_WASTAGE_EVIDENCE
SCANOPS_STORE_USE_EVIDENCE
SCANOPS_SCANNER_INTAKE_EVIDENCE
SCANOPS_MARKDOWN_EVIDENCE
```

Any rename, alias, or migration must be separately documented.

## Future migration boundary

A future implementation phase must introduce the schema in a disabled state only.

The first implementation must not:

- Register runtime handlers.
- Start transport.
- Start outbox processing.
- Start replay.
- Process events.
- Write Inventory records.
- Write stock movements.
- Change prices.
- Affect POS.
- Affect orders.
- Affect forecasts.
- Mutate Item Master records.

## Operator visibility boundary

A future UI may display disabled bridge state and local configuration readiness for operator/admin visibility only.

It must not expose an activation toggle unless a later activation-governance phase explicitly approves that capability.

## Audit boundary

Future local configuration changes must be visible and reviewable, but must not imply bridge runtime activity.

Audit or local review records should track:

- Field changed.
- Previous value reference.
- New value reference.
- Actor.
- Environment.
- Reason.
- Approval reference.
- Timestamp.

## Explicit non-authorization

This document does not authorize schema creation, runtime activation, transport, sync, replay, outbox processing, local persistence writes, Inventory writes, or operational mutation.

## Acceptance criteria

Phase 2C passes only if it remains documentation-only planning for a future disabled local configuration schema and no runtime behavior is implemented or activated.
