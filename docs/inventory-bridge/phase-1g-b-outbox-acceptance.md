# Invyra ScanOps Bridge Phase 1G-B Outbox Acceptance Criteria

Status: acceptance proposal only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Phase: `1G-B`  
Runtime state: not implemented and not activated

## Purpose

This document defines acceptance criteria for the ScanOps outbox schema proposal.

Phase 1G-B is complete only when the outbox schema is documented clearly enough for later review, while preserving the non-operational bridge boundary.

## Required documentation outputs

Phase 1G-B must document:

- Proposed future outbox store name.
- Proposed top-level fields.
- Field intent.
- Proposed ScanOps outbox statuses.
- Proposed evidence-only event types.
- Proposed Inventory receipt statuses tracked by ScanOps.
- Immutability rules.
- Retry rules.
- Receipt boundary.
- No-mutation boundary.
- Offline-first boundary.
- Validation order.
- Future implementation prerequisites.

## Docs-only requirement

Phase 1G-B must be documentation only.

Allowed files:

```text
docs/inventory-bridge/phase-1g-b-outbox-schema-proposal.md
docs/inventory-bridge/phase-1g-b-outbox-validation-rules.md
docs/inventory-bridge/phase-1g-b-outbox-acceptance.md
```

No source files, IndexedDB implementation files, API files, workflow files, package files, validator files, or runtime files should change in this phase.

## Forbidden changes

Phase 1G-B must not add or modify:

- IndexedDB stores.
- Local persistence write code.
- Base44 entities.
- Service modules.
- API routes.
- Transport clients or servers.
- Sync loops.
- Event replay code.
- Queue processors.
- Receipt processors.
- Inventory write code.
- Stock movement code.
- Pricing code.
- POS code.
- Order code.
- Forecasting code.
- Item Master code.

## Runtime guardrails

The bridge must remain non-operational:

```text
runtime_activation_allowed=false
sync_allowed=false
transport_allowed=false
event_replay_allowed=false
local_persistence_write_allowed=false
inventory_writes_allowed=false
stock_mutation_allowed=false
price_mutation_allowed=false
pos_mutation_allowed=false
order_mutation_allowed=false
forecasting_mutation_allowed=false
item_master_mutation_allowed=false
```

## Review checks

Before merging Phase 1G-B, confirm:

- The pull request is docs-only.
- The pull request contains no executable code.
- The pull request contains no package or workflow changes.
- The proposed schema does not authorize direct Inventory mutation.
- The proposed validation rules preserve Inventory as source of truth.
- The proposed statuses distinguish queued, submitted, accepted-to-ledger, rejected, duplicate, quarantined, temporary failure, and operator-action-required outcomes.
- The proposed future event types are evidence-only.
- The document states that a later explicit implementation phase is required.

## Future implementation boundary

A later implementation phase must be separately approved before creating any actual outbox store or write path.

Phase 1G-B does not authorize:

- Creating `scanops_inventory_bridge_outbox`.
- Writing to any outbox.
- Sending any ScanOps event.
- Processing any Inventory receipt.
- Running any transport.
- Running any replay engine.
- Posting any operational mutation.

## Acceptance result

Phase 1G-B passes only if it remains a schema proposal and validation-rule documentation set with no runtime behavior.
