# Phase 39-0F5 — ScanOps Governed Item Search and Operational View

## Scope

Repository: `chrykoolaid/invyra-scanops`  
Companion Inventory baseline: `de4ceca8d137d8acf409031cf986c858a792606d`  
Environment: TEST and TRAINING only  
LIVE and PRODUCTION: blocked

## Objective

Extend the existing ScanOps `/scan` authoritative item lookup workflow with:

- bounded item-name search;
- explicit candidate selection;
- authoritative operational item view.

This phase does not create a second endpoint, transport, queue, cache, local catalogue or mutation path.

## Locked architecture

```text
ScanOps /scan
→ existing trusted connection and pairing preflight
→ canonical LOOKUP_REQUEST transport
→ governed ITEM_SEARCH_REQUEST or ITEM_VIEW_REQUEST payload
→ Inventory-owned read function
→ correlated canonical read-only receipt
```

The outer canonical operation remains:

```text
LOOKUP_REQUEST
```

The governed read operation is carried inside the lookup payload.

## Item-name search

ScanOps sends:

```json
{
  "trustReference": "temporary-pairing-trust-reference",
  "operation": "ITEM_SEARCH_REQUEST",
  "operator_role": "staff",
  "payload": {
    "search_type": "NAME",
    "query": "detergent 2L",
    "page": 1,
    "limit": 20
  }
}
```

Controls:

- query is required and limited to 128 characters;
- search type is always `NAME`;
- page is a positive integer;
- limit is capped at 20;
- operator role must be staff, supervisor, manager, admin or owner;
- candidates are displayed exactly as returned by Inventory;
- active and inactive lifecycle states remain visible;
- no candidate is automatically selected;
- opening a candidate requires an explicit **View this item** action.

## Operational item view

After explicit candidate selection, ScanOps sends:

```json
{
  "trustReference": "temporary-pairing-trust-reference",
  "operation": "ITEM_VIEW_REQUEST",
  "operator_role": "staff",
  "payload": {
    "canonical_item_id": "inventory-item-id"
  }
}
```

The approved view may display:

- item name and short display name;
- SKU;
- brand and category;
- pack size and unit of measure;
- primary and alternate barcodes;
- lifecycle and active status;
- batch, expiry and serialised controls;
- storage guidance;
- minimum shelf-life requirement;
- Inventory update timestamp.

No stock quantity, cost, selling price, supplier terms or other sensitive fields are inferred or displayed unless a later Inventory-owned contract explicitly authorises them.

## Neurodiverse-friendly workflow

The `/scan` page uses two clear modes:

```text
Scan / SKU
Search name
```

Only one primary task is presented at a time. Search results use large candidate cards, visible lifecycle chips and one explicit action. The item view groups information into **Identity** and **Handling** sections.

No hidden gesture, automatic selection or automatic navigation is used.

## Existing exact lookup compatibility

The certified Phase 39-0E path remains unchanged:

```text
hardware barcode or exact SKU
→ LOOKUP_REQUEST
→ queryInventoryItemLookup
→ authoritative exact result
```

A found exact result may expose one explicit **Open operational item view** action using the returned canonical item ID.

## Connection and trust gate

Every governed read requires:

- a current trusted pairing profile;
- TEST or TRAINING;
- matching device, session, store and environment scope;
- target Inventory instance ID;
- unexpired trust reference;
- previously verified connected health state;
- signed-in operator ID;
- permitted operator role.

Inventory independently revalidates the same transport and read-authorisation boundaries.

## Receipt validation

ScanOps rejects a result unless:

- the receipt is canonical and correlated;
- the outer operation remains `LOOKUP_REQUEST`;
- the nested result operation matches the requested governed read;
- the query or canonical item ID matches the request;
- search results explicitly state `autoSelected: false`;
- accepted results declare LIVE catalogue scope;
- required candidate or item identity fields are present;
- the exact approved mutation-counter set is present;
- every mutation count is numeric zero.

## Locked safety boundaries

- No automatic retry.
- No offline queue.
- No search-result persistence.
- No selected-item persistence.
- No local, stale, mock or cached authoritative fallback.
- No automatic candidate selection.
- No Inventory credential is sent to ScanOps.
- No Inventory, stock, ledger, pricing, purchase-order, Receiving, Item Master or ScanOps mutation.
- Receiving integration remains blocked.
- LIVE and PRODUCTION remain blocked.

## Automated certification

```bash
node scripts/validate-phase39-0f5-scanops-item-search-view.mjs
```

Expected marker:

```text
SCANOPS_ITEM_SEARCH_VIEW_READY
```

The dedicated workflow also runs:

- Phase 39-0E operational lookup compatibility;
- Phase 39-0E.1 connection-scope compatibility;
- Phase 39-0D lookup compatibility;
- canonical bridge contract and adapter compatibility;
- Phase 35-A transport compatibility;
- Phase 36-A pairing compatibility;
- Phase 39-0B connection compatibility;
- application build;
- targeted lint.

## Required real local acceptance after merge

1. Start Inventory and the local bridge controller.
2. Configure TRAINING or TEST.
3. Authorise Inventory item reads.
4. Start the listener and pair ScanOps.
5. Verify the trusted connection.
6. Open `/scan` and confirm **Scan / SKU** remains the default.
7. Run a known exact barcode or SKU lookup.
8. Open its operational item view.
9. Switch to **Search name**.
10. Search a real partial item name that returns multiple candidates.
11. Confirm no candidate opens automatically.
12. Select one candidate explicitly and verify the authoritative operational item view.
13. Search an item name with no matches and confirm the controlled no-results state.
14. Open an inactive item and confirm its lifecycle warning remains visible.
15. Clear Inventory read authorisation and confirm the next search fails closed.
16. Disconnect or expire trust and confirm no search or item view dispatch occurs.
17. Confirm zero mutations throughout.
