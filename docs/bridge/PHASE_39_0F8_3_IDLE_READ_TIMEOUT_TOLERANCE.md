# Phase 39-0F8.3 — Idle Inventory Read Timeout Tolerance

## Acceptance failure

During the real Windows/Chrome connection soak test:

- immediate exact SKU lookup passed;
- the 15-minute lookup passed;
- the 30-minute lookup dispatched while ScanOps still considered Inventory connected, but failed with `LOOKUP_TIMEOUT`.

The live ScanOps item-read client allowed only four seconds for Inventory to complete the authoritative Base44 read. That window was too short for a legitimate read after an idle period.

## Correction

The exact legacy operational timeout request:

```text
4000 ms
```

is upgraded to:

```text
15000 ms
```

for the live Inventory Item Lookup client.

This remains one governed request. The correction does not add:

- automatic retry;
- replay;
- queueing;
- persistence;
- local catalogue fallback;
- stale result fallback;
- automatic selection.

Explicit custom timeout values remain unchanged so deterministic timeout tests and diagnostics can still exercise the fail-closed path quickly.

## Architecture boundary

```text
ScanOps explicit operator request
→ one canonical LOOKUP_REQUEST
→ Inventory-owned authoritative read
→ correlated read-only receipt
```

Inventory Desktop remains the system of record. TEST and TRAINING remain the only admitted environments. LIVE and PRODUCTION remain blocked. Receiving integration remains blocked.

## Mutation boundary

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

## Required real acceptance

After installing this ScanOps branch while leaving the Inventory Phase 39-0F8.2 branch in place:

1. pair once;
2. confirm automatic Inventory read access;
3. run `CHM-LIVE-001` immediately;
4. repeat after 15, 30 and 60 minutes;
5. confirm Detergent 5L returns each time;
6. do not reauthorise, re-pair, restart terminals or use Repair read access;
7. confirm all mutations remain zero.

A genuine request that exceeds fifteen seconds must still fail closed as `LOOKUP_TIMEOUT` and must not retry automatically.
