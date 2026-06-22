# Phase 2B Configuration Schema Acceptance

Status: acceptance review only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Required review outputs

Phase 2B must document ScanOps-side configuration and runtime settings design for:

- Bridge feature flags.
- Local device identity configuration.
- Store/location scope configuration.
- Target Inventory instance configuration.
- Event-type allow-lists.
- Schema-version allow-lists.
- Kill-switch configuration.
- Default-off runtime rules.
- Configuration validation rules.
- Operator visibility expectations.

## Docs-only requirement

Allowed files:

```text
docs/inventory-bridge/phase-2b-configuration-schema-runtime-settings.md
docs/inventory-bridge/phase-2b-configuration-schema-acceptance.md
```

No source files, IndexedDB files, package files, workflow files, scripts, validators, credentials, local persistence files, or runtime files should change.

## Forbidden changes

Phase 2B must not add or modify runtime bridge code, transport clients, sync loops, replay engines, outbox processors, IndexedDB stores, local persistence writes, receipt processors, credential storage, Inventory write paths, stock movement paths, pricing paths, POS paths, order paths, forecasting paths, or Item Master paths.

## Guardrail result

Phase 2B passes only if it remains review-only and preserves:

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

## Acceptance result

ScanOps Phase 2B is acceptable only when the PR contains documentation files only and no runtime behavior can be inferred from the diff.

The review must fail if any file outside the allowed documentation paths changes.
