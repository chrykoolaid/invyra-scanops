# Bridge Phase 3 — Inventory Desktop Listener Contract

## Purpose

Define the listener-side contract before real ScanOps queue transport is enabled.

This phase describes how Inventory Desktop should acknowledge ScanOps handoff envelopes in the future. It does not enable live network POSTs and does not perform Inventory writes from ScanOps.

## Added helper

```text
src/lib/scanOpsDesktopListenerContract.js
```

Exports:

- `DESKTOP_LISTENER_CONTRACT_VERSION`
- `DESKTOP_LISTENER_ENDPOINTS`
- `DESKTOP_RECEIPT_STATUSES`
- `buildDesktopHealthRequest`
- `buildDesktopReceiptEnvelope`
- `validateDesktopReceiptEnvelope`
- `mapDesktopReceiptToQueueStatus`

## Proposed listener endpoints

```text
GET  /scanops/health
POST /scanops/handoff
GET  /scanops/receipt/:envelopeId
```

These endpoints are contract placeholders for future Inventory Desktop work.

## Receipt statuses

Inventory Desktop may return:

- `accepted`
- `rejected`
- `needs_review`
- `duplicate`
- `conflict`
- `unavailable`

ScanOps maps these statuses into local queue states only.

## System of record rule

Inventory Desktop remains the only layer that can validate, post, approve, reconcile, or mutate Inventory truth.

ScanOps can only:

- submit an envelope
- store a receipt
- display status
- retry eligible technical failures
- show review guidance

## Guardrails

This phase does not change:

- Inventory Desktop data
- Stock levels
- Prices
- Ledger behaviour
- Audit behaviour
- Sync queue engine behaviour
- Transport activation
- User permissions

## Acceptance criteria

- Listener endpoints are documented.
- Receipt envelope helper exists.
- Receipt validator exists.
- Receipt-to-queue status mapping exists.
- No live network transport is enabled.
- No workflow code is changed.

## Next phase

Bridge Phase 4 should add a controlled mock integration test harness that exercises:

1. desktop profile
2. queue item
3. transport envelope
4. listener receipt
5. local queue status mapping

without posting to real Inventory Desktop.
