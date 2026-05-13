# Invyra ScanOps Stage AP — Pilot Data Contracts Finalisation v1 Notes

Baseline: `Invyra_ScanOps_StageAO_ErrorStatesRecoveryPaths_v1.zip`

Output: `Invyra_ScanOps_StageAP_PilotDataContractsFinalisation_v1.zip`

## Purpose

Stage AP is a strict pilot contract freeze. It finalises the data language for existing ScanOps workflows so the handheld, desktop inventory, future APIs, audit trail, sync queue, and UAT tests can agree on field names, statuses, safe failure reasons, and offline truth handling.

## Added

- `docs/STAGE_AP_PILOT_DATA_CONTRACTS.md`
  - Shared event envelope.
  - Shared item snapshot.
  - Shared status vocabularies.
  - Workflow payload contracts for Product Lookup, Receiving, Stock Count, Replenishment, Price / Promo Check, Shelf Tickets, Markdown, Waste, Transfers, and Sync Queue.
  - Required vs optional field guidance.

- `docs/STAGE_AP_PAYLOAD_EXAMPLES.md`
  - Pilot/UAT payload examples for the shared envelope and every existing workflow contract.
  - Retryable vs blocked sync queue examples with operator-safe next actions.

- `docs/STAGE_AP_CONTRACT_FINALISATION_NOTES.md`
  - Stage AP finalisation notes, acceptance checklist, and carry-forward rule.

- `src/lib/scanopsContracts.js`
  - Small exported constants for contract version, event types, workflows, statuses, safe failure reasons, envelope fields, item snapshot fields, and workflow payload field lists.
  - No schema framework, no validation engine, and no UI import added.

## Explicit non-changes

- No Home launcher changes.
- No keyboard changes.
- No new workflow tiles.
- No new screens.
- No filters.
- No dashboard cards.
- No diagnostics/admin contract viewer.
- No backend API implementation.
- No database migration.
- No live desktop sync.
- No event bus/webhooks.
- No schema validation engine.
- No printer routing.
- No supplier API.
- No price override engine.
- No catalogue admin.
- No approval workflow redesign.
- No role redesign.
- No operator-facing raw JSON/debug payload viewer.

## Validation

- `npm run lint` passed.
- `npm run build` passed.

`node_modules` and `dist` are excluded from the output ZIP.
