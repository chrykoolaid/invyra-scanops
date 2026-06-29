# ScanOps UI Workflow Stabilization Checkpoint

Date: 2026-06-29

## Purpose

This checkpoint documents the post-merge stabilization review for the ScanOps enterprise workflow UI program.

The workflow program converted the primary handheld operational areas to a consistent operator-first model:

- Session-first
- Scan-first
- Large touch targets
- Clear current context
- One dominant action
- Evidence-only where the Inventory Desktop remains the system of record

## Verified merged workflow PRs

| Workflow | PR | Status |
|---|---:|---|
| Transfers | #134 | Merged |
| Waste | #135 | Merged |
| Markdown | #136 | Merged |
| Expiry | #137 | Merged |
| Reporting | #139 | Merged |
| Movements | #140 | Merged |

Count was already present on main before the post-merge workflow verification pass.

## Route verification

`src/App.jsx` routes the operational workflow paths to the operator workflow pages:

| Route | Operator page |
|---|---|
| `/stock-count` | `StockCountOperator` |
| `/transfers` | `TransfersOperator` |
| `/waste` | `WasteOperator` |
| `/markdowns` | `MarkdownsOperator` |
| `/expiry-check` | `ExpiryCheckOperator` |
| `/scanops-reporting` | `ScanOpsReportingOperator` |
| `/movements` | `MovementsOperator` |

## Static guardrail verification

Static connector-based review confirmed:

- Operator page imports are wired from `src/App.jsx`.
- Shared UI primitives are exported from `WorkflowPrimitives.jsx`.
- `WorkflowHeader` supports the workflow props used by the operator pages.
- Count helper exports exist in `scanOpsStockCount.js`.
- Transfers helper exports exist in `scanOpsReceivingTransfers.js`.
- Waste helper exports exist in `scanOpsWasteReview.js`.
- Markdown helper exports exist in `scanOpsMarkdownApproval.js` and `scanOpsRequestLifecycle.js`.

## Guardrails retained

No stabilization change alters:

- Inventory bridge contracts
- Sync transport contracts
- Inventory Desktop system-of-record ownership
- Ledger behavior
- Audit behavior
- Direct stock posting
- Direct price mutation

## Local build status

A real local `npm run build` could not be executed from the assistant container because GitHub DNS resolution was unavailable in the runtime environment.

Required local verification command:

```bash
git checkout main
git pull
npm install
npm run build
```

## Smoke-test checklist

After local build passes, manually smoke-test:

- Home tile opens each workflow.
- Bottom navigation remains stable.
- Scan/search loads an item in each scan-first workflow.
- Primary action remains obvious.
- Empty states are never dead ends.
- Evidence-only language appears where required.
- Reporting and Movements remain read-only.
- No workflow bypasses Inventory Desktop ownership.

## Next recommended product area

After this checkpoint is accepted, move to Sync & Connectivity polish:

- Bridge status clarity
- Offline/online state clarity
- Sync queue visibility
- Desktop pairing health
- Recovery guidance
- Known desktop profiles
- Manual IP/hostname fallback
