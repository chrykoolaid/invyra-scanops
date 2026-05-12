# Invyra ScanOps Stage W — Receiving + Transfer Exception Hardening v1

Baseline: `Invyra_ScanOps_StageV_StockCountSessionGovernance_v2.zip`

## Scope delivered

- Rebuilt Receiving into a batch-first workspace with Active Batches, Start Receiving Batch, batch header, receiving evidence cards, saved line list, exception review cards, and staff read-only behavior after submission.
- Rebuilt Transfers into a lifecycle workspace with Active Transfers, Start Transfer, dispatch evidence, receive evidence, separate dispatch/receive lines, transfer exceptions, and review actions.
- Added local Stage W receiving/transfer contract in `src/lib/scanOpsReceivingTransfers.js` covering local batch storage, receiving lines, receiving exceptions, transfer dispatch lines, transfer receive lines, transfer exceptions, review decisions, and no-direct-stock-posting fields.
- Added Stage W event types for receiving/transfer batch open/start, exception recording, dispatch evidence, receive evidence, and batch submission.
- Preserved Stage U expiry / lot / weighted evidence inside receiving evidence saves.
- Preserved Product Identity Review routing through the shared WorkflowHeader unknown-item evidence path.

## Guardrails preserved

- Home launcher untouched.
- Keyboard untouched.
- Product Lookup untouched.
- Stock Count session governance untouched.
- Shared search resolver untouched.
- No toasts added.
- No horizontal table layout added.
- No direct stock mutation from handheld.
- No price mutation.
- No printer/reporting/offline-conflict dashboard work added.

## Files changed

- `src/pages/Receiving.jsx`
- `src/pages/Transfers.jsx`
- `src/lib/scanOpsReceivingTransfers.js`
- `src/lib/scanOpsEvents.js`

## Build verification

- `npm run build` passed.
- `npm run lint` passed.
