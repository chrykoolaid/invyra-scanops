# Invyra ScanOps Bridge Phase 1G-D Acceptance Criteria

Status: acceptance criteria only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Purpose

This document defines acceptance criteria for the ScanOps-side local simulation harness design phase.

## Required documentation outputs

Phase 1G-D must document:

- Future local simulation harness purpose.
- ScanOps-side responsibilities.
- Non-goals.
- Proposed future simulation flow.
- Proposed future report fields.
- Fixture boundaries.
- Required hard-stop behavior.
- Scenario review list.

## Docs-only requirement

Phase 1G-D must be documentation only.

Allowed files:

```text
docs/inventory-bridge/phase-1g-d-local-simulation-harness-design.md
docs/inventory-bridge/phase-1g-d-simulation-scenarios.md
docs/inventory-bridge/phase-1g-d-acceptance.md
```

No source files, package files, workflow files, validator files, scripts, IndexedDB files, or runtime files should change in this phase.

## Forbidden changes

Phase 1G-D must not add or modify:

- Simulation scripts.
- Package scripts.
- GitHub workflows.
- Runtime bridge modules.
- Transport clients.
- API callers.
- IndexedDB stores.
- Local outbox implementation.
- Local persistence writes.
- Replay engines.
- Receipt processors.
- Inventory write paths.
- Stock movement paths.
- Pricing paths.
- POS paths.
- Order paths.
- Forecasting paths.
- Item Master paths.

## Required guardrails

The design must preserve:

```text
runtime_activation_allowed=false
transport_allowed=false
sync_allowed=false
replay_allowed=false
local_persistence_write_allowed=false
inventory_write_allowed=false
stock_mutation_allowed=false
price_mutation_allowed=false
pos_mutation_allowed=false
order_mutation_allowed=false
forecasting_mutation_allowed=false
item_master_mutation_allowed=false
```

## Review checks

Before merging Phase 1G-D, confirm:

- The pull request is docs-only.
- No executable harness is added.
- No package or workflow changes are added.
- The design uses static fixtures only.
- The design produces local-only reports only.
- The design does not authorize runtime bridge activation.
- The design does not authorize local persistence writes.
- The design does not authorize Inventory mutation.

## Acceptance result

Phase 1G-D passes only if it remains local simulation harness design documentation with no runtime behavior.
