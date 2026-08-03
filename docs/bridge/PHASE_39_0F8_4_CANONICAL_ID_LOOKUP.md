# Phase 39-0F8.4 — Canonical Item ID Exact Lookup

## Baselines

Inventory Desktop:

```text
chrykoolaid/invyra-base44
2efd675623f3933ee24ff5f18115b7f15dfde7f1
```

ScanOps:

```text
chrykoolaid/invyra-scanops
73a8844354306a889c840802b0728adef83b7cea
```

Environment:

```text
TEST and TRAINING only
```

LIVE and PRODUCTION remain blocked.

## Acceptance failure

Real Windows/Chrome acceptance confirmed that the unified field, partial-name search, exact SKU lookup, explicit selection and zero-mutation boundary worked correctly.

The displayed Inventory Sell ID:

```text
6a2837ecb8270c9119eeebae
```

was incorrectly classified as a SKU. Inventory therefore returned `ITEM_NOT_FOUND` even though that canonical item ID belongs to `Detergent 5L` / `CHM-LIVE-001`.

## Repair

ScanOps now identifies long hexadecimal Inventory item identities as:

```text
CANONICAL_ID
```

The unified field still supports:

- hardware barcode scans;
- exact barcodes;
- exact SKUs;
- exact canonical Inventory item IDs displayed as Sell IDs;
- partial item-name search.

The transport operation remains the existing:

```text
LOOKUP_REQUEST
```

A canonical ID request carries:

```json
{
  "lookupType": "CANONICAL_ID",
  "lookupValue": "6a2837ecb8270c9119eeebae"
}
```

No new outer canonical transport operation is introduced.

## Explicit operator control

A found canonical ID follows the same exact-match workflow as a barcode or SKU:

1. ScanOps displays the exact Inventory match.
2. The operational item view does not open automatically.
3. The operator must select **Open operational item view**.

An unknown canonical ID returns `ITEM_NOT_FOUND`. ScanOps does not automatically run a name search, retry the request, reuse stale item data or choose another item.

## Safety boundaries

- Inventory Desktop remains the system of record.
- ScanOps receives no Inventory credential.
- No automatic result opening.
- No automatic fallback.
- No automatic retry.
- No queue, local catalogue or offline persistence.
- No Inventory, stock, ledger, pricing, purchase-order, Receiving, Item Master or ScanOps mutation.
- Receiving remains blocked.
- LIVE and PRODUCTION remain blocked.

## Automated validation

Run:

```bash
node scripts/validate-phase39-0f8-4-canonical-id-lookup.mjs
node scripts/validate-phase39-0f8-1-unified-partial-item-lookup.mjs
node scripts/validate-phase39-0f8-current-main-item-lookup-reconciliation.mjs
node scripts/validate-phase39-0e-operational-item-lookup.mjs
npm run build
```

Expected marker:

```text
SCANOPS_CANONICAL_ID_LOOKUP_READY
```

## Required Windows/Chrome acceptance

Use:

```text
evidence/phase39-0f8-4-canonical-id-lookup-acceptance.template.json
```

Required checks:

1. Run Inventory and ScanOps from the exact Phase 39-0F8.4 candidates.
2. Configure and start the Inventory listener in TRAINING.
3. Confirm trusted pairing, health and Inventory item-read authority.
4. Search `6a2837ecb8270c9119eeebae` in the unified ScanOps field.
5. Confirm an exact Inventory match for `Detergent 5L`, SKU `CHM-LIVE-001`.
6. Confirm the operational item view does not open automatically.
7. Select **Open operational item view** explicitly.
8. Search unknown canonical ID `ffffffffffffffffffffffff`.
9. Confirm `ITEM_NOT_FOUND`, no automatic name fallback and no stale result.
10. Clear Inventory read authority or stop the listener and confirm the next request fails closed without retry.
11. Confirm `CHM-LIVE-001` stock remains unchanged.
12. Confirm every mutation count remains zero.

## Completion gate

Phase 39-0F8.4 is complete only when both companion repository workflows pass and real Windows/Chrome TRAINING acceptance passes with zero mutations.

Receiving integration must not begin before that gate is satisfied.
