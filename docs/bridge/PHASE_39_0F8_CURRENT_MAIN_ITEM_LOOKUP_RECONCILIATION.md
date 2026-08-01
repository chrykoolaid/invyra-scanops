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
ScanOps exact lookup or name search
→ trusted TRAINING connection
→ canonical LOOKUP_REQUEST
→ governed Inventory read operation
→ correlated read-only receipt
→ explicit operator-controlled item view
```

Inventory remains the system of record.

ScanOps does not create, update, delete, post, approve, persist, queue, cache, or infer Inventory truth.

## Reconciled workflow

### Exact lookup

The default mode is:

```text
Scan / SKU
```

It accepts a hardware barcode scan or an exact barcode, SKU, or sell ID.

A found result displays an exact Inventory match first. The operational item view opens only after the operator selects:

```text
Open operational item view
```

No exact result opens automatically.

### Exact not found

An exact not-found response remains visible and controlled.

ScanOps does not automatically run an item-name search. The operator may explicitly select:

```text
Search this value by name
```

### Item-name search

The second mode is:

```text
Search name
```

It returns Inventory-owned candidates with no automatic selection. A candidate opens only after the operator explicitly selects:

```text
View this item
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

The redesigned UI retains Inventory, Locations and Sales tabs for future expansion, but they now show truthful scope messages only.

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
7. Confirm the Scan / SKU and Search name modes are visible and clear.
8. Run a known exact barcode or SKU lookup.
9. Confirm the exact result remains visible and does not open automatically.
10. Select Open operational item view and verify the authoritative identity and handling projection.
11. Run an exact value that does not exist.
12. Confirm no name search starts automatically.
13. Select Search this value by name and verify candidates appear.
14. Run a partial name search returning multiple candidates.
15. Confirm no candidate auto-selects.
16. Explicitly select an active candidate and an inactive candidate.
17. Confirm price is absent.
18. Confirm Inventory, Locations and Sales tabs explain unavailable scope and show no inferred or simulated values.
19. Clear Inventory read authorisation and confirm the next read fails closed without automatic retry or stale data.
20. Disconnect or expire trust and confirm dispatch is blocked.
21. Confirm every mutation count remains zero.

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
