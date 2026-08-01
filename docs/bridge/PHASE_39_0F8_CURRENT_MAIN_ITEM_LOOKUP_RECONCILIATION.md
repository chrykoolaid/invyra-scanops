# Phase 39-0F8 — Current-Main Item Lookup Reconciliation

## Repositories and verified baselines

Inventory Desktop:

```text
chrykoolaid/invyra-base44
4346c8895b38b35006eba5d4d763ed32f2548cc0
```

ScanOps base:

```text
chrykoolaid/invyra-scanops
e7ea23e3a219ba26f874eefbad5f54d4856f7632
```

Environment:

```text
TEST and TRAINING only
```

LIVE and PRODUCTION remain blocked.

## Purpose

Phase 39-0F5 through Phase 39-0F7 established the governed Item Lookup bridge, authoritative item-name search, explicit candidate selection, operational item view, and acceptance kit.

Later ScanOps current-main UI changes introduced behaviour and presentation that had not been certified against those locked contracts. Phase 39-0F8 reconciles the redesigned Item Lookup UI with the authoritative Inventory read boundary before Receiving integration begins.

## Locked architecture

```text
ScanOps unified lookup field
→ trusted TRAINING connection
→ exact BARCODE/SKU lookup or governed NAME search
→ canonical LOOKUP_REQUEST
→ governed Inventory read operation
→ correlated read-only receipt
→ explicit operator-controlled item view
```

Inventory remains the system of record.

ScanOps does not create, update, delete, post, approve, persist, queue, cache, or infer Inventory truth.

## Unified lookup workflow

The former visible `Scan / SKU` and `Search name` tabs are replaced by one field:

```text
Scan barcode or enter SKU, sell ID, or item name
```

This reduces operator steps while preserving the governed distinction between exact lookup and item-name search.

### Exact identifiers

The unified field accepts:

- a hardware barcode scan;
- an exact barcode;
- an exact SKU;
- an exact sell ID or canonical identifier.

A found exact result displays an Inventory match first. The operational item view opens only after the operator selects:

```text
Open operational item view
```

No exact result opens automatically.

### Partial item-name search

Plain alphabetic text is treated as an item-name search.

One or more letters are valid. Examples:

```text
b   → candidate list containing matching B items
ble → Bleach candidates
 det → Detergent candidates
```

The Inventory-owned search ranks results deterministically:

1. exact item name;
2. item name starts with the query;
3. SKU starts with the query;
4. brand-and-item-name match;
5. item name contains the query.

The first page is capped at 20 results. No candidate is automatically selected. A candidate opens only after the operator explicitly selects:

```text
View this item
```

### Exact not found

An exact not-found response remains visible and controlled.

ScanOps does not automatically convert a failed exact lookup into an item-name search. The operator may explicitly select:

```text
Search this value by name
```

## Authorised item view data

The operational item view may display only the Inventory-certified identity and handling projection:

- canonical item identity;
- item name and short display name;
- SKU;
- brand and category;
- pack size and unit of measure;
- primary and alternate barcodes;
- lifecycle and active state;
- batch, expiry and serialised controls;
- minimum shelf-life requirement;
- storage guidance;
- Inventory update timestamp.

## Unsupported tabs

The redesigned UI retains Inventory, Locations and Sales tabs for future expansion, but they show truthful scope messages only.

The current Item Lookup contract does not authorise:

- stock on hand or available stock;
- unavailable, committed, reserved or wasted quantities;
- delivery or in-transit values;
- site or shelf location stock;
- price or cost;
- sales totals, averages, dates or trend series.

No unsupported value is estimated, cached, inferred or simulated. The prior synthetic sales chart is removed.

## Safety boundaries

- No automatic candidate selection.
- No automatic exact-result navigation.
- No automatic not-found fallback.
- No automatic retry.
- No local catalogue fallback.
- No offline queue.
- No search-result or selected-item persistence.
- No Inventory credential exposed to ScanOps.
- No stock, ledger, pricing, purchase-order, Receiving or Item Master mutation.
- Receiving integration remains blocked.
- LIVE and PRODUCTION remain blocked.

## Automated certification

Run:

```bash
node scripts/validate-phase39-0f8-current-main-item-lookup-reconciliation.mjs
node scripts/validate-phase39-0f5-scanops-item-search-view.mjs
node scripts/validate-phase39-0f6-cross-repository-item-read-acceptance.mjs
node scripts/validate-phase39-0f7-real-local-operator-acceptance-kit.mjs
npm run build
```

Expected Phase 39-0F8 marker:

```text
PHASE_39_0F8_CURRENT_MAIN_ITEM_LOOKUP_RECONCILED
```

## Required real Windows/Chrome acceptance

Use:

```text
evidence/phase39-0f8-current-main-item-lookup-acceptance.template.json
```

Required operator checks:

1. Start Inventory at the verified Startup V2 main baseline.
2. Confirm the Inventory root and Inventory Settings devices route load in Chrome.
3. Start the local bridge controller in TRAINING.
4. Authorise Inventory item reads.
5. Start ScanOps from the Phase 39-0F8 candidate.
6. Pair ScanOps and confirm trusted health.
7. Confirm one unified lookup field is visible and no separate mode tabs remain.
8. Run a known exact barcode or SKU lookup.
9. Confirm the exact result remains visible and does not open automatically.
10. Select Open operational item view and verify the authoritative identity and handling projection.
11. Search with one letter, such as `b`, and confirm a candidate list appears without auto-selection.
12. Search `ble` and confirm Bleach appears when present in Inventory.
13. Search `det` and confirm Detergent appears when present in Inventory.
14. Confirm the initial result page contains no more than 20 candidates.
15. Explicitly select a candidate using View this item.
16. Run an exact value that does not exist.
17. Confirm no name search starts automatically.
18. Select Search this value by name and verify candidates appear.
19. Confirm price is absent.
20. Confirm Inventory, Locations and Sales tabs explain unavailable scope and show no inferred or simulated values.
21. Clear Inventory read authorisation and confirm the next read fails closed without automatic retry or stale data.
22. Disconnect or expire trust and confirm dispatch is blocked.
23. Confirm every mutation count remains zero.

## Completion gate

Phase 39-0F8 may be declared complete only when:

```text
all automated workflows pass
AND
real Windows/Chrome acceptance passes
AND
zero mutation evidence is recorded
```

Receiving integration must not begin before this gate is satisfied.
