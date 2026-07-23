# Phase 39-0E.1 — Connection Scope Consistency

## Defect

The Sync & Connectivity page could display **Connected to Inventory** after a successful trusted health request while the active ScanOps store still differed from the paired Inventory store.

The `/scan` operational lookup correctly failed closed with `STORE_SCOPE_MISMATCH`, producing contradictory operator states.

## Correction

A global pairing-scope synchronizer now treats the current trusted pairing profile as the temporary active ScanOps connection scope.

When all of the following are true:

- a valid unexpired pairing profile exists;
- the current device ID matches the paired device ID;
- the current session ID matches the paired session ID;
- the paired environment is TEST or TRAINING;
- the pairing profile contains an Inventory store ID;

ScanOps aligns only these local session fields:

- `storeId`;
- `storeName`;
- `environment`.

The synchronizer does not rewrite device identity, session identity, operator identity or any Inventory-owned data.

## Safety boundary

No Inventory mutation is added.

No stock, ledger, pricing, purchase-order, Receiving or Item Master mutation is added.

LIVE and PRODUCTION remain blocked.

The `/scan` authoritative pre-dispatch store, environment and session checks remain unchanged.

## Expected runtime result

After trusted pairing and health verification, the active ScanOps store/environment scope converges to the paired Inventory scope. The Sync & Connectivity and `/scan` pages therefore use the same connection identity.

A device or session identity mismatch is not reconciled and still requires a fresh pairing flow.

## Certification

```bash
node scripts/validate-phase39-0e1-connection-scope-consistency.mjs
```

Expected marker:

```text
SCANOPS_CONNECTION_SCOPE_CONSISTENCY_READY
```
