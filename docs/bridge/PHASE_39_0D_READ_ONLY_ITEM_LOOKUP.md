# Phase 39-0D — ScanOps Read-Only Item Lookup Pilot

## Scope

Repository: `chrykoolaid/invyra-scanops`  
Companion repository: `chrykoolaid/invyra-base44`  
Environment: TEST and TRAINING only  
LIVE and PRODUCTION: blocked

## Objective

Allow a paired ScanOps operator to scan a barcode or enter an exact SKU and
request authoritative item information from Inventory through the existing
local bridge.

ScanOps remains an operational display layer. It does not receive Base44
credentials and cannot create items, change stock, post ledger entries, alter
pricing, update purchase orders or perform Receiving.

## Operator flow

```text
Connect and verify Inventory
→ choose Barcode or SKU
→ scan or enter a value
→ submit canonical LOOKUP_REQUEST
→ receive a correlated read-only receipt
→ display item details or ITEM_NOT_FOUND
```

The lookup card appears only after the existing trusted health check reports
`Connected to Inventory`.

## Request requirements

Each request includes:

- canonical envelope, trace and idempotency identifiers;
- `LOOKUP_REQUEST` operation type;
- TEST or TRAINING environment;
- paired device ID;
- paired session ID;
- configured store ID;
- signed-in ScanOps operator ID;
- target Inventory instance ID;
- temporary trust reference;
- lookup type (`BARCODE` or `SKU`);
- lookup value.

No Inventory or Base44 credential is included.

## Displayed result

For a found item, ScanOps may display:

- item name;
- SKU;
- primary barcode;
- lifecycle status;
- batch-tracked flag;
- expiry-tracked flag.

An unknown value displays `ITEM_NOT_FOUND`. An unavailable or expired Inventory
read authorisation displays a controlled attention state and does not retry
automatically.

## Safety and recovery

- A lookup is never queued or persisted.
- ScanOps performs no automatic retry.
- Timeout is explicit and leaves the operator in control.
- Canonical envelope and receipt correlation are mandatory.
- The receipt must include all-zero mutation evidence.
- Invalid trust or scope is rejected.
- Receiving remains blocked.

## Automated certification

```bash
node scripts/validate-phase39-0d-read-only-item-lookup.mjs
```

Expected marker:

```text
SCANOPS_READ_ONLY_LOOKUP_READY
```

The validator covers envelope construction, found and not-found results,
canonical correlation, zero mutations, unavailable authorisation, rejected
trust, invalid input, blocked LIVE and timeout behaviour.

## Required real acceptance after both repositories merge

1. Start and authorise the Inventory TRAINING bridge.
2. Pair ScanOps using the existing two-minute code.
3. Confirm `Connected to Inventory`.
4. Open the read-only lookup card.
5. Select SKU.
6. Enter a known TRAINING SKU or `PHASE39-NOT-FOUND-001`.
7. Select **Look up item**.
8. Confirm an authoritative item or `ITEM_NOT_FOUND`.
9. Confirm `Zero mutations verified`.
10. Clear Inventory read authorisation and confirm the next lookup fails closed.
