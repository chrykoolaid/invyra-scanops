# Phase 2B Configuration Schema & Runtime Settings Design

Status: architecture/specification only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Purpose

Phase 2B defines the ScanOps-side configuration schema and runtime settings design for the future ScanOps ↔ Inventory bridge.

This phase is documentation/specification only. It does not add runtime bridge code, transport, sync, replay, outbox processing, local persistence writes, Inventory writes, or operational mutation.

## Non-negotiable guardrails

Phase 2B keeps the default outcome as:

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

## Configuration principles

ScanOps-side bridge configuration must be:

- Default-off.
- Explicitly scoped.
- Environment-aware.
- Store/location-aware.
- Device-aware.
- Event-type allow-list based.
- Schema-version allow-list based.
- Inventory-target aware.
- Kill-switch controlled.
- Operator-visible.
- Non-mutating by design.

Missing, empty, invalid, or partial configuration must evaluate to disabled.

## Proposed configuration shape

Future configuration may be represented as a ScanOps-owned local bridge settings object that remains subordinate to Inventory trust.

Proposed shape:

```json
{
  "bridge_enabled": false,
  "transport_enabled": false,
  "replay_enabled": false,
  "outbox_processing_enabled": false,
  "environment": "development|test|training|production",
  "local_device_id": null,
  "target_inventory_instance_id": null,
  "accepted_schema_versions": [],
  "accepted_event_types": [],
  "allowed_store_ids": [],
  "kill_switches": {
    "global_disabled": true,
    "transport_disabled": true,
    "outbox_processing_disabled": true,
    "replay_disabled": true
  },
  "operator_visibility_required": true
}
```

This is a schema proposal only and does not create any entity, local store, or runtime object.

## Required settings

A future runtime must require every field below to be valid before any bridge behavior can be considered enabled:

| Setting | Required behavior | Default |
| --- | --- | --- |
| `bridge_enabled` | Master feature flag | `false` |
| `transport_enabled` | Allows transport layer only if separately approved | `false` |
| `outbox_processing_enabled` | Allows local outbox processing only if separately approved | `false` |
| `replay_enabled` | Allows replay only if separately approved | `false` |
| `local_device_id` | Identifies the local ScanOps device | `null` |
| `target_inventory_instance_id` | Binds ScanOps to one Inventory target | `null` |
| `accepted_schema_versions` | Allow-list of event schema versions | `[]` |
| `accepted_event_types` | Allow-list of evidence event types | `[]` |
| `allowed_store_ids` | Store/location allow-list | `[]` |
| `kill_switches` | Disable controls | disabled |
| `operator_visibility_required` | Requires clear operator status display | `true` |

## Feature flag rules

Feature flags must be hierarchical.

```text
bridge_enabled=false disables everything
transport_enabled=false disables transport even if bridge_enabled=true
outbox_processing_enabled=false disables outbox processing even if bridge_enabled=true
replay_enabled=false disables replay regardless of all other settings
```

No child flag may enable behavior if the parent flag is disabled.

## Store/location scope rules

ScanOps must block or locally invalidate evidence when:

- Store scope is missing.
- Store scope is not allow-listed.
- Store scope conflicts with the target Inventory instance.
- Store scope is broader than the approved deployment scope.

No ScanOps event may infer store/location scope from operator text alone.

## Device identity configuration

A future local device entry may include:

```text
device_id
pairing_reference
store_scope
allowed_event_types
local_status
disabled_at
disabled_reason
last_reviewed_by
last_reviewed_at
```

ScanOps may represent local device identity, but Inventory owns final trust acceptance.

## Event-type allow-list

Accepted event types must be explicit and must align with the existing ScanOps event contract identifiers documented in the Phase 1G inbound-ledger schema and validation material.

A future allow-list may include evidence-only event types such as:

```text
SCANOPS_FLOOR_GAP_EVIDENCE
SCANOPS_WASTAGE_EVIDENCE
SCANOPS_STORE_USE_EVIDENCE
SCANOPS_SCANNER_INTAKE_EVIDENCE
SCANOPS_MARKDOWN_EVIDENCE
```

This list does not authorize any operational mutation. Event types are evidence categories only. Any rename or alias from these identifiers must be handled as a separately documented migration rather than silently changing the allow-list names.

## Schema-version allow-list

Accepted schema versions must be explicit.

Unsupported, missing, or future schema versions must be blocked, locally invalidated, rejected, or quarantined by default.

```text
accepted_schema_versions=[] means no schema is accepted
```

## Kill-switch configuration

Kill-switches must be evaluated before any future runtime action.

Required scopes:

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

A kill-switch must stop future bridge activity and preserve evidence/audit history.

## Configuration validation rules

Future configuration validation must fail closed when:

- Any required field is missing.
- Any flag is not explicitly boolean.
- Any allow-list is missing or empty where required.
- Local device identity is missing.
- Target Inventory instance identity is missing.
- Environment is unknown.
- Store/location scope is ambiguous.
- Event type is unsupported.
- Schema version is unsupported.
- Kill-switch state is ambiguous.

Failure must result in disabled, locally invalid, rejected, or quarantined state, never mutation.

## Operator visibility requirements

Future operator visibility should clearly distinguish:

- Capture-only status.
- Pending local evidence.
- Locally invalid evidence.
- Submitted evidence.
- Receipt pending evidence.
- Rejected evidence.
- Quarantined evidence.
- Duplicate evidence.
- Mismatch evidence.
- Disabled bridge state.

Operator visibility must not present bridge evidence as a stock update, price update, POS update, order update, forecasting update, or Item Master update.

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

Phase 2B passes only if it remains configuration schema/runtime settings design documentation and no runtime behavior is implemented or activated.
