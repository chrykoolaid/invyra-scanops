# Bridge Phase 13 — Manual Retry Execution Boundary

Phase 13 introduces a controlled manual retry boundary for ScanOps bridge receipts.

## Scope

- Consumes Phase 12 receipt decision intent surfaces.
- Filters only explicit `Retry manually` selections.
- Requires an explicit operator retry request.
- Requires `executeRetry: true` before dispatch.
- Delegates handoff execution through the existing manual sync execution path.

## Guardrails

- No automatic retry.
- No background retry loop.
- No queue writes.
- No silent queue mutation.
- No direct Inventory mutation from ScanOps.
- No stock, price, ledger, or approval mutation.
- Retry results expose projected queue patches only.

## Direct validation

Run:

```bash
node scripts/validate-scanops-bridge-manual-retry-execution-boundary.mjs
```

Then run the existing bridge validations and build.
