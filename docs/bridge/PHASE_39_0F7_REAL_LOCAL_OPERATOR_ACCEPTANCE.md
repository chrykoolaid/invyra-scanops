# Phase 39-0F7 — Real Local Operator Acceptance

## Baseline refresh

Phase 39-0F7.1 refreshes the ScanOps execution baseline only. It does not add bridge behaviour or certify the human result.

The refreshed ScanOps baseline includes later Waste, session-lock and settings work. Those commits do not change the certified item-search or item-view client, but the real operator acceptance must run against the exact current product baseline rather than the earlier Phase 39-0F7 merge point.

## Purpose

Phase 39-0F7 must be completed by a human operator using the visible ScanOps `/scan` interface and an actual Inventory catalogue through the local TEST or TRAINING bridge.

The repository workflow certifies that the acceptance kit is safe and complete. It **does not certify acceptance by itself**. Final acceptance remains incomplete until the operator records real catalogue and visual evidence and the completed file passes validation.

## Locked baselines

```text
Inventory main:
de4ceca8d137d8acf409031cf986c858a792606d

ScanOps main:
47891e62941af3be939ab9ac9f4e5bfa28c94242
```

Do not execute the acceptance against different commits without updating and re-certifying this kit.

## Locked architecture

```text
visible ScanOps /scan interface
→ canonical LOOKUP_REQUEST transport
→ governed ITEM_SEARCH_REQUEST or ITEM_VIEW_REQUEST payload
→ Inventory-owned read application
→ correlated read-only receipt
```

Candidate selection must always be explicit. ScanOps must never open the first result automatically.

## Prepare actual catalogue records

Before starting, identify existing records in the actual Inventory catalogue:

1. One barcode or exact SKU that resolves to an item.
2. One partial item-name query that returns at least one active item and one inactive item.
3. One search term that returns no results.

Do not create or change catalogue records during this acceptance. If no suitable inactive item exists, stop and prepare the data separately through governed Item Master procedures.

## Start Inventory locally

From the Inventory repository:

```bash
git checkout main
git pull --ff-only
git rev-parse HEAD
npm ci
npm run dev -- --host 0.0.0.0
```

Confirm the commit is:

```text
de4ceca8d137d8acf409031cf986c858a792606d
```

In a second Inventory terminal:

```bash
npm run bridge:pilot
```

The local control endpoint defaults to `http://127.0.0.1:8787`.

In Inventory, open **Settings → Sync & Devices** and:

1. Configure TEST or TRAINING.
2. Confirm the store and Inventory instance.
3. Complete the supported Base44 callback.
4. Authorise the short-lived item-read adapter.
5. Start the public listener.
6. Generate a temporary pairing code.

Never place a password, callback credential, token or pairing code in screenshots or evidence.

## Start ScanOps locally

From the ScanOps repository:

```bash
git checkout main
git pull --ff-only
git rev-parse HEAD
npm ci
npm run dev -- --host 0.0.0.0
```

Confirm the commit is:

```text
47891e62941af3be939ab9ac9f4e5bfa28c94242
```

Open ScanOps from the controlled local HTTP address. Pair it from **Sync & Connectivity**, then run the trusted connection test. Continue only when the connected state is visible.

## Visible acceptance sequence

### 1. Screen readiness

Open `/scan` and confirm:

- **Scan / SKU** is visible;
- **Search name** is visible;
- the bold-blocks shell remains readable at handheld width;
- the later session controls do not obstruct the item lookup workflow;
- no action occurs automatically on page load.

Screenshot label: `connected`.

### 2. Exact lookup

In **Scan / SKU**:

1. Scan the real barcode or enter the exact SKU.
2. Confirm the authoritative item is returned.
3. Record its item name and canonical ID.
4. Confirm **Zero mutations verified** is visible.

Screenshot label: `exact-lookup`.

### 3. Item-name search

In **Search name**:

1. Enter the prepared partial name.
2. Confirm results come from the actual Inventory catalogue.
3. Confirm an active item and an inactive item are visible.
4. Confirm lifecycle states are clear.
5. Confirm **No auto-select** behaviour.
6. Confirm **View this item** requires an explicit action.

Screenshot label: `search-candidates`.

### 4. Active item view

Explicitly select the active item and confirm:

- **Operational item view** opens only after selection;
- Identity is visible;
- Handling is visible;
- lifecycle status is ACTIVE;
- **Zero mutations verified** is visible.

Screenshot label: `active-item-view`.

### 5. Inactive item view

Return to results, explicitly select the inactive item and confirm:

- lifecycle status is INACTIVE;
- the inactive warning is clear;
- Identity and Handling are visible;
- **Zero mutations verified** is visible.

Screenshot label: `inactive-item-view`.

### 6. No-results state

Search the prepared no-results term and confirm:

- a clear no-results state appears;
- previous candidate cards are removed;
- no stale item opens;
- no automatic retry occurs.

Screenshot label: `no-results`.

### 7. Blocked role

Confirm a role outside staff, supervisor, manager, admin or owner is blocked before dispatch. Do not alter the production role model solely for this test.

### 8. Authorisation-clear failure

In Inventory, clear the short-lived item-read authorisation, then attempt another visible ScanOps read.

Confirm:

- the visible status is `AUTHORIZATION_UNAVAILABLE`;
- the operator is told to reauthorise in Inventory;
- no previous item or candidates are reused;
- no automatic retry occurs.

Screenshot label: `authorization-unavailable`.

## Usability acceptance

The operator must confirm:

- candidate cards are readable at handheld width;
- ACTIVE and INACTIVE states are immediately clear;
- the primary next action is obvious;
- error recovery guidance is understandable;
- the workflow is calm and low-cognitive-load for neurodiverse and general users.

Any failed usability point keeps the phase incomplete.

## Record and validate evidence

Run the interactive recorder:

```bash
node scripts/run-phase39-0f7-real-local-operator-acceptance.mjs --record evidence/phase39-0f7-local-operator-acceptance.json
```

The recorder does not contact either application and does not store secrets. It records human observations only.

Validate the result:

```bash
node scripts/run-phase39-0f7-real-local-operator-acceptance.mjs --validate evidence/phase39-0f7-local-operator-acceptance.json
```

A complete pass reports:

```text
REAL_LOCAL_OPERATOR_ACCEPTANCE_CERTIFIED
```

An incomplete result exits non-zero and lists blockers.

## Required screenshots

```text
connected
exact-lookup
search-candidates
active-item-view
inactive-item-view
no-results
authorization-unavailable
```

Store screenshots outside the repository when they contain business catalogue information. The evidence file may reference controlled local paths.

## Pass boundary

Phase 39-0F7 passes only when the exact locked commits are used, TEST or TRAINING is active, actual catalogue records are shown, active and inactive results are explicitly selected, no-results clears stale candidates, authorisation clear fails closed, all usability checks pass, all screenshot references exist, and every mutation counter remains zero.

## Locked exclusions

- LIVE disabled.
- PRODUCTION disabled.
- Receiving integration blocked.
- No Inventory, stock, ledger, Item Master, pricing, purchase-order, Receiving or ScanOps mutation.
- No automatic selection.
- No automatic retry.
- No queue write.
- No persistence.
- No local catalogue fallback.
- No Inventory credential exposure to ScanOps.
