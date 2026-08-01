# Phase 39-0F8.1 — Unified Partial Item Lookup

## Baselines

Inventory Desktop:

```text
chrykoolaid/invyra-base44
4346c8895b38b35006eba5d4d763ed32f2548cc0
```

ScanOps main after Phase 39-0F8:

```text
chrykoolaid/invyra-scanops
52b2b6f4711ca87e031b05d1b3028daa402698d2
```

Environment:

```text
TEST and TRAINING only
```

LIVE and PRODUCTION remain blocked.

## Purpose

Phase 39-0F8 restored a governed, read-only Item Lookup workflow. Real Windows/Chrome testing then showed that separate visible `Scan / SKU` and `Search name` tabs added an unnecessary operator step.

Phase 39-0F8.1 replaces those visible tabs with one unified field while preserving the governed distinction between exact lookup and item-name search.

## Unified operator workflow

The operator sees one field:

```text
Scan barcode or enter SKU, sell ID, or item name
```

The same primary action is used for every manual lookup:

```text
Find item
```

### Exact identifiers

The unified field routes the following to the exact Inventory lookup contract:

- hardware barcode scans;
- numeric barcodes;
- exact SKU values such as `CHM-LIVE-001`;
- structured or canonical identifiers.

A found exact match remains visible before the operational item view opens. The operator must explicitly select:

```text
Open operational item view
```

### Partial item-name search

Plain alphabetic text is routed to Inventory-owned NAME search.

One or more letters are valid:

```text
b   → matching B-item candidates
ble → Bleach candidates
det → Detergent candidates
```

The authoritative Inventory function at the pinned baseline:

- accepts any non-empty query up to 128 characters;
- ranks exact names first;
- then ranks item names starting with the query;
- then ranks SKUs starting with the query;
- then brand-and-name matches;
- then item names containing the query;
- caps each result page at 20;
- returns `auto_selected: false`.

ScanOps displays the candidate list exactly as governed by Inventory. It does not automatically choose the first result. The operator must explicitly select:

```text
View this item
```

### Exact not found

A failed exact lookup remains an exact not-found state.

ScanOps does not silently convert it to a name search. The operator may explicitly select:

```text
Search this value by name
```

## Locked safety boundaries

- Inventory Desktop remains the system of record.
- ScanOps remains the handheld operational layer.
- No automatic candidate selection.
- No automatic exact-result navigation.
- No automatic exact-to-name fallback.
- No automatic retry.
- No local catalogue fallback.
- No offline queue or search persistence.
- No Inventory credential exposed to ScanOps.
- No stock, ledger, pricing, purchase-order, Receiving, Item Master, Inventory, or ScanOps mutation.
- Receiving integration remains blocked.
- LIVE and PRODUCTION remain blocked.

## Automated validation

Run:

```bash
node scripts/validate-phase39-0f8-1-unified-partial-item-lookup.mjs
node scripts/validate-phase39-0f8-current-main-item-lookup-reconciliation.mjs
node scripts/validate-phase39-0f5-scanops-item-search-view.mjs
node scripts/validate-phase39-0f7-real-local-operator-acceptance-kit.mjs
npm run build
```

Expected marker:

```text
PHASE_39_0F8_1_UNIFIED_PARTIAL_ITEM_LOOKUP_READY
```

## Required Windows/Chrome acceptance

Use:

```text
evidence/phase39-0f8-1-unified-partial-item-lookup-acceptance.template.json
```

Required checks:

1. Start Inventory at `4346c8895b38b35006eba5d4d763ed32f2548cc0`.
2. Start the Inventory bridge controller and listener in TRAINING.
3. Pair ScanOps and confirm trusted health and item-read authorisation.
4. Confirm one lookup field is visible and no separate mode tabs remain.
5. Search `b` and confirm a candidate list appears without automatic selection.
6. Search `ble` and confirm Bleach appears when present in Inventory.
7. Search `det` and confirm Detergent appears when present in Inventory.
8. Confirm the first page contains no more than 20 candidates.
9. Select a candidate using View this item.
10. Run an exact SKU or barcode and confirm the exact result does not open automatically.
11. Confirm unsupported Inventory, Locations, Sales, and price data remain absent.
12. Confirm all mutation counts remain zero.
13. Confirm authorisation and trust failures remain fail-closed.

## Completion gate

Phase 39-0F8.1 is complete only when:

```text
all automated workflows pass
AND
real Windows/Chrome TRAINING acceptance passes
AND
zero mutation evidence is recorded
```

Receiving work must not begin before this gate is satisfied.
