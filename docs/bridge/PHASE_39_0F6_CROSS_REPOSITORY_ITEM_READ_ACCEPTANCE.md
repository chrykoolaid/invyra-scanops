# Phase 39-0F6 — Cross-Repository Item Read Acceptance

## Repositories

- Inventory: `chrykoolaid/invyra-base44`
- ScanOps: `chrykoolaid/invyra-scanops`

## Certified baselines

```text
Inventory main: de4ceca8d137d8acf409031cf986c858a792606d
ScanOps main:   d144e365f93b194e7a3e81bf172aa5f1418b671c
```

## Objective

Prove that the certified Inventory item-read runtime and certified ScanOps item-read client work together through a real local HTTP listener in TEST/TRAINING conditions.

This phase does not add another bridge, endpoint, contract or runtime feature. It checks out both certified repositories and exercises their existing implementations together.

## Accepted architecture

```text
ScanOps trusted device pairing
→ correlated DEVICE_HEALTH_PING
→ canonical LOOKUP_REQUEST transport
→ ITEM_SEARCH_REQUEST or ITEM_VIEW_REQUEST nested payload
→ Inventory-owned read adapter
→ Inventory read function invocation
→ canonical correlated read-only receipt
→ ScanOps candidate list or operational item view
```

Transport admission and Inventory read application remain separate.

## Automated module-to-module sequence

The Phase 39-0F6 harness performs the following sequence against the two checked-out repositories:

1. Start the Inventory bridge controller on an ephemeral local port.
2. Configure the Inventory runtime for TRAINING.
3. Authorise the Inventory read adapter through its local control endpoint.
4. Start the Inventory public bridge listener.
5. Create a short-lived Inventory pairing code.
6. Pair a ScanOps device and session through the actual pairing HTTP flow.
7. Send and correlate an actual health request.
8. Run an exact SKU lookup to preserve Phase 39-0E compatibility.
9. Run an item-name search through the governed nested contract.
10. Confirm Inventory returns two bounded candidates with `autoSelected: false`.
11. Explicitly select the active candidate and request its operational item view.
12. Explicitly select the inactive candidate and preserve its inactive state.
13. Run a no-result name search.
14. Attempt a governed read with a blocked operator role and prove that no request is dispatched.
15. Clear Inventory read authorisation.
16. Attempt another item view and prove it fails closed without returning a stale item.
17. Clear ScanOps temporary pairing and stop the Inventory runtime.

## Deterministic Inventory evidence

The test-only Inventory client factory exposes only read invocations:

```text
queryInventoryItemLookup
queryInventoryItemSearch
queryInventoryItemView
```

The fixture represents deterministic authoritative read output. It is not a local ScanOps catalogue and is never used by the ScanOps application as an operational fallback.

The expected invocation counts are:

```text
Exact lookup: 1
Name search:  2
Item view:    2
```

Blocked-role and cleared-authorisation checks must not call an Inventory read function.

## Acceptance states

### Exact lookup compatibility

A known exact SKU must still return its authoritative canonical item ID with a correlated receipt and zero mutations.

### Name search

A partial name search must return bounded authoritative candidates with:

- LIVE catalogue scope;
- explicit paging values;
- no automatic candidate selection;
- canonical item identity;
- lifecycle status;
- exact zero-mutation evidence.

### Active item view

An explicitly selected active candidate must return the Inventory-owned operational item view with active lifecycle state.

### Inactive item view

An explicitly selected inactive candidate must remain visibly inactive. ScanOps must not reinterpret or silently reactivate it.

### No results

A no-result search must remain an accepted, correlated read with an empty candidate list and no automatic selection.

### Role blocked

A role outside Staff, Supervisor, Manager, Admin or Owner must fail before dispatch.

### Authorisation cleared

After Inventory read authorisation is cleared, the next read must return `AUTHORIZATION_UNAVAILABLE` / `SERVICE_UNAVAILABLE`, must not invoke an Inventory function, and must not display the previously viewed item.

## Locked boundaries

- TEST and TRAINING only.
- LIVE and PRODUCTION blocked.
- Inventory Desktop remains the system of record.
- No ScanOps catalogue fallback.
- No automatic selection.
- No automatic retry.
- No queue write.
- No search-result persistence.
- No selected-item persistence.
- No Inventory credentials returned to ScanOps.
- No Receiving integration.
- No Inventory, stock, ledger, pricing, purchase-order, Receiving, Item Master or ScanOps mutation.

## Mutation evidence

```text
Inventory mutations:       0
Stock mutations:           0
Ledger mutations:          0
Item Master mutations:     0
Pricing mutations:         0
Purchase-order mutations:  0
Receiving mutations:       0
ScanOps mutations:         0
```

## Automated certification

```bash
INVENTORY_REPO_PATH=inventory-repo \
INVENTORY_PHASE39_0F4_SHA=de4ceca8d137d8acf409031cf986c858a792606d \
node scripts/validate-phase39-0f6-cross-repository-item-read-acceptance.mjs
```

Expected marker:

```text
SCANOPS_CROSS_REPOSITORY_ITEM_READ_ACCEPTANCE_READY
```

Expected readiness:

```text
READY_FOR_REAL_LOCAL_OPERATOR_ACCEPTANCE
```

## Remaining manual acceptance

Repository certification does not replace a real operator test with locally running Inventory and ScanOps frontends.

After this phase passes and merges, the required manual acceptance is:

1. Start Inventory Desktop and ScanOps locally.
2. Configure TRAINING and authorise Inventory reads.
3. Pair and verify ScanOps.
4. Open **Lookup Item**.
5. Search a real partial item name.
6. Confirm candidates appear and nothing opens automatically.
7. Select one candidate.
8. Confirm its authoritative operational item view.
9. Select or search an inactive item and confirm the inactive warning.
10. Run a no-result search.
11. Clear Inventory read authorisation.
12. Confirm the next read fails closed without showing the previous item.
13. Confirm no stock, ledger, Item Master, Receiving or ScanOps mutation occurred.

Phase 39-0F6 may be repository-certified before that manual test, but full operational acceptance requires the real operator evidence.
