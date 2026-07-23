# Phase 39-0E — Operational Item Lookup

## Scope

Repository: `chrykoolaid/invyra-scanops`  
Companion repository: `chrykoolaid/invyra-base44`  
Environment: TEST and TRAINING only  
LIVE and PRODUCTION: blocked

## Objective

Connect the normal ScanOps `/scan` workflow to the already-certified Inventory
read bridge without creating another API, bridge client, lookup contract or item
resolver.

The operational path now reuses:

- `runLiveItemLookup`;
- `createScanOpsItemLookupClientV1`;
- the canonical `LOOKUP_REQUEST` contract;
- the temporary trusted pairing profile;
- the Inventory-owned authoritative item-read adapter.

## Operational workflow

```text
Scan barcode or enter exact SKU in /scan
→ verify paired device, trust, session, store and environment
→ require a previously correlated trusted health check
→ call runLiveItemLookup
→ send canonical LOOKUP_REQUEST
→ receive and validate a correlated receipt
→ display the authoritative Inventory projection
```

## Supported search modes

Only these modes are operational:

- exact hardware-scanner barcode;
- exact manually entered SKU.

Item-name and PLU search are not presented as supported. No bounded authoritative
contract exists for those modes in this phase.

## Local lookup retirement

The previous `/scan` path was not the certified Inventory bridge. It used the
shared `WorkflowHeader` catalogue resolver and then opened `/product/:id`, where
`resolveInventoryIdentity` could read a warmed local provider cache or explicit
mock fixtures when mock mode was enabled.

Phase 39-0E removes that path from `/scan`:

- no `WorkflowHeader` catalogue suggestions;
- no `resolveInventoryIdentity`;
- no `inventorySystemAdapter` lookup;
- no mock fixture fallback;
- no navigation to `/product/:id` after a scan.

The legacy product page remains available to other legacy workflows, but it is
not represented as an authoritative result by the primary operational lookup.

## Connection and trust gate

Before dispatch, ScanOps requires:

- TEST or TRAINING;
- a current paired profile;
- the current ScanOps device ID to match the paired device;
- the current ScanOps session ID to match the paired session;
- the current ScanOps store to match the paired store;
- the current ScanOps environment to match the paired environment;
- a target Inventory instance ID;
- a current trust reference and unexpired trust time;
- a signed-in ScanOps operator;
- a previous correlated `CONNECTED` health result.

A failed preflight returns a controlled disconnected or scope state and does not
create a lookup client or dispatch an envelope.

Inventory remains responsible for authoritative store, environment, Inventory
instance, trusted-device and read-authorisation revalidation on every request and
eligible replay.

## Operator states

### Connected

- hardware barcode scans submit automatically;
- manual entry accepts one exact SKU;
- one **Look up SKU** action is shown;
- the current TRAINING or TEST store scope is visible.

### Disconnected

The page displays **Inventory not connected** and one action to open
**Sync & Connectivity**. It does not use local, cached or mock item data.

### Authorisation unavailable

The page displays **Inventory read authorisation unavailable** and explains that
Inventory Desktop must be reauthorised. The failed request is not automatically
retried and the previous result is cleared before the next request.

### Item not found

```text
Item not found
ITEM_NOT_FOUND
Zero mutations verified
```

### Item found

The current certified Inventory projection displays:

- item name;
- SKU;
- primary barcode;
- lifecycle status;
- batch-tracked status;
- expiry-tracked status.

Unit of measure, primary location and authoritative quantity are rendered only
when the Inventory-approved projection provides those fields. Phase 39-0D does
not currently provide stock quantity. Cost and sensitive pricing are not
rendered.

## Safety controls

- local/private Inventory host over plain local HTTP only;
- public destinations blocked before dispatch;
- HTTPS destinations blocked before dispatch;
- no Base44 credential transmitted to ScanOps;
- no lookup result persistence;
- no queue write;
- no automatic network retry;
- explicit timeout;
- canonical envelope and receipt correlation required;
- malformed or uncorrelated receipts rejected;
- exact approved mutation-counter set required;
- every approved mutation counter must be numeric zero;
- missing, extra, non-numeric or nonzero mutation evidence rejected.

## Locked mutation boundary

```text
Inventory mutations:       0
Stock mutations:           0
Ledger mutations:          0
Pricing mutations:         0
Purchase-order mutations:  0
Receiving mutations:       0
Item Master mutations:     0
ScanOps mutations:         0
```

Still blocked:

```text
Receiving integration
LIVE
PRODUCTION
```

## Automated certification

```bash
node scripts/validate-phase39-0e-operational-item-lookup.mjs
```

Expected marker:

```text
SCANOPS_OPERATIONAL_ITEM_LOOKUP_READY
```

The dedicated workflow also runs the Phase 39-0D lookup certifications, canonical
contract and adapter validators, Phase 35-A transport compatibility, Phase 36-A
pairing compatibility, Phase 39-0B connection compatibility, application build
and targeted lint.

## Required real local acceptance after merge

1. Start the Inventory frontend and bridge controller.
2. Configure TRAINING.
3. Authorise the Inventory read adapter.
4. Start the listener.
5. Pair and connect ScanOps.
6. Open `/scan`.
7. Scan a real Inventory barcode or enter a real exact SKU.
8. Confirm the authoritative item details appear.
9. Enter `PHASE39-NOT-FOUND-001` as an exact SKU.
10. Confirm `ITEM_NOT_FOUND` and **Zero mutations verified**.
11. Clear Inventory read authorisation.
12. Confirm the next lookup fails closed without showing the previous item.
13. Disconnect ScanOps.
14. Confirm `/scan` displays **Inventory not connected** and directs the operator to Sync & Connectivity.
