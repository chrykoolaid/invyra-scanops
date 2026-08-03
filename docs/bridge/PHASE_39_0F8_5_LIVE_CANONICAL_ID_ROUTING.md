# Phase 39-0F8.5 — Live Canonical Item ID Routing Repair

## Verified acceptance failure

Real Windows/Chrome TRAINING testing was performed after Phase 39-0F8.4 had merged.

Both of these exact Inventory canonical IDs were rejected before transport:

```text
6a2837ecb8270c9119eeebae
ffffffffffffffffffffffff
```

Observed ScanOps result:

```text
ITEM_LOOKUP_INPUT_INVALID
Scan a barcode or enter an exact SKU.
```

The Inventory listener configuration remained TEST/TRAINING-only and no business mutation was attempted.

## Root cause

The unified lookup classifier and the lower-level bridge client both recognised:

```text
CANONICAL_ID
```

However, `runLiveItemLookup` in `src/lib/scanOpsLiveConnectivity.js` still admitted only:

```text
BARCODE
SKU
```

The request therefore failed inside ScanOps before any dispatch to Inventory.

## Repair

The live routing boundary now admits the three governed exact lookup types:

```text
BARCODE
SKU
CANONICAL_ID
```

No type rewriting is performed. The detected canonical ID is forwarded unchanged through the existing `LOOKUP_REQUEST` transport.

The operator validation message now identifies the supported Inventory sell ID input.

## Locked safety boundaries

- Inventory Desktop remains the system of record.
- TEST and TRAINING only.
- LIVE and PRODUCTION remain blocked.
- No automatic result selection or opening.
- No automatic fallback or retry.
- No local catalogue or queue.
- No persistence.
- No Inventory, stock, ledger, pricing, purchase-order, Receiving, Item Master or ScanOps mutation.
- Receiving integration remains blocked.

## Automated certification

```bash
node scripts/validate-phase39-0f8-5-live-canonical-id-routing.mjs
node scripts/validate-phase39-0f8-4-canonical-id-lookup.mjs
node scripts/validate-phase39-0f8-1-unified-partial-item-lookup.mjs
node scripts/validate-phase39-0f8-current-main-item-lookup-reconciliation.mjs
node scripts/validate-phase39-0e-operational-item-lookup.mjs
npm run build
```

Expected marker:

```text
SCANOPS_LIVE_CANONICAL_ID_ROUTING_READY
```

## Required real retest

Use the ScanOps candidate branch against the merged Inventory main.

1. Confirm trusted TRAINING connection.
2. Search `6a2837ecb8270c9119eeebae`.
3. Confirm exact `Detergent 5L` / `CHM-LIVE-001` result.
4. Confirm the operational item view does not open automatically.
5. Open it explicitly.
6. Search `ffffffffffffffffffffffff`.
7. Confirm `ITEM_NOT_FOUND` without name fallback, retry or stale result.
8. Confirm all mutation counts remain zero and stock values remain unchanged.

The repair must remain unmerged until this retest passes.
