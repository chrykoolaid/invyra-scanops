# Invyra ScanOps — Pilot Run 1 Stock Item Catalogue + Scan Flow Validation Evidence

## Baseline

- Baseline package: `Invyra_ScanOps_PilotRun0_RealDeviceValidationEvidence_v1_FINAL.zip`
- Output package: `Invyra_ScanOps_PilotRun1_StockItemCatalogueScanFlowValidation_v1.zip`
- Date prepared: 2026-05-14
- Device / viewport: Pending real-device test
- Browser: Pending real-device test
- Tester: Pending
- Build command result: Pass — `npm run build` completed and generated `dist/`; Base44 proxy warning shown because `VITE_BASE44_APP_BASE_URL` was not set.
- Lint command result: Pass — `npm run lint` completed with no reported errors.
- Package preparation result: Notes-only validation pack. No app files were changed.

## Pilot Run 1 Rule

Pilot Run 1 validates the stock item catalogue and scan/search flow only.

No new workflow tiles, filters, dashboards, setup wizard, backend rebuild, route-host rewrite, AppEscapeHeader rewrite, role/sync/offline rewrite, or fake operational data.

Allowed for this run:

- Stock item catalogue for testing.
- Evidence notes.
- Blocker-only fixes if a release blocker is found during real-device validation.

Not allowed for this run:

- Fake receiving history.
- Fake transfers.
- Fake markdown approvals.
- Fake waste reviews.
- Fake tasks.
- Fake sync success.
- Fake collaboration users.
- Fake operational history.
- Any lookup behavior that creates stock movement/history by itself.

## Static Package Pre-Check

| Check | Result | Notes |
|---|---|---|
| Baseline extracted successfully | Pass | Source ZIP opened and package structure was readable. |
| `/scan` route exists | Pass | `src/App.jsx` contains `/scan` route. |
| `/product/:id` lookup route exists | Pass | Scan lookup can resolve into product detail route. |
| Shared Home escape remains route-host owned | Pass | `AppEscapeHeader` route-host standard remains untouched. |
| Stock catalogue exists | Pass | `src/lib/inventorySnapshot.js` contains pilot test catalogue metadata and stock items. |
| Stock catalogue appears limited to product/item catalogue data | Pass | Static review found item catalogue context; no app files changed in this pass. |
| Lint | Pass | `npm run lint`. |
| Build | Pass | `npm run build`. |
| App files changed | Pass | No app source files changed. Notes file only. |

## Stock Catalogue Validation

| Check | Result | Notes |
|---|---|---|
| Stock catalogue exists | Pre-check pass / device validation pending | `INVENTORY_SNAPSHOT_ITEMS` exists in `src/lib/inventorySnapshot.js`. |
| Stock items have item names | Pre-check pass / device validation pending | Catalogue includes named pilot items such as Coke No Sugar 1.25L, Milk 2L, Greek Yoghurt 1kg, Chicken Breast 1kg, Strawberries 250g, Bananas loose, Organic bananas, Apples loose, Bread loaf, and Seafood Tray 500g. |
| Stock items have SKU/item codes | Pre-check pass / device validation pending | Catalogue includes SKU values across the test items. |
| Stock items have barcode values | Pre-check pass / device validation pending | Packaged/barcoded items include barcode/GTIN values; loose/PLU-led produce may rely on PLU/scale codes. |
| Stock items have readable unit/category/context | Pre-check pass / device validation pending | Items include department/category/unit/location/stock context fields where applicable. |
| Stock catalogue does not include fake operational history | Pending real-device validation | Static pass did not alter or add operational history. Real-device UI must confirm no fake history is exposed. |
| Product lookup/search can use catalogue items | Pending real-device validation | Resolver/search components exist; real-device test must confirm actual operator flow. |

## Scan Flow Validation

| Scenario | Result | Notes |
|---|---|---|
| Known barcode scan returns correct item | Pending real-device validation | Test with `930000000001` → Coke No Sugar 1.25L. |
| Manual barcode entry returns correct item | Pending real-device validation | Test with `930000000004` → Greek Yoghurt 1kg. |
| Item name search returns correct item | Pending real-device validation | Test with `Greek`, `Milk`, or `Bread`. |
| SKU/item code search returns correct item | Pending real-device validation | Test with `SKU-YOG-1KG` or `GROC-COKE-NS-125`. |
| Unknown barcode shows clear no-match state | Pending real-device validation | Test with `9999999999999`; no fake item should be created. |
| Retry path is clear | Pending real-device validation | Operator should be able to scan again/search manually without page refresh. |
| Result card is readable on handheld viewport | Pending real-device validation | Confirm on physical device/handheld viewport. |
| Primary action is visible/reachable | Pending real-device validation | Confirm the operator can select/continue without clipped buttons. |
| No horizontal scrolling | Pending real-device validation | Must be visually checked on handheld viewport. |
| No fake stock movement created by lookup | Pending real-device validation | Lookup/select must not create count, transfer, waste, markdown, receiving, or sync records. |

## Route Checks

| Route | Opens | Home Escape | Scan/Search Context Stable | No Horizontal Scroll | Main Action Reachable | Result | Notes |
|---|---|---|---|---|---|---|---|
| `/scan` | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Primary Pilot Run 1 route. |
| `/stock-count` | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Secondary only if reached/validated from scan/search context. |
| `/gap-scan` | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Secondary only if reached/validated from scan/search context. |
| `/replenish` | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Secondary only if reached/validated from scan/search context. |
| `/expiry-check` | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Secondary only if reached/validated from scan/search context. |
| `/shelf-tickets` | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Secondary only if reached/validated from scan/search context. |

## Test Items Used

| Item Name | SKU / Item Code | Barcode / PLU | Lookup Method | Result | Notes |
|---|---|---|---|---|---|
| Coke No Sugar 1.25L | GROC-COKE-NS-125 | 930000000001 | Scan | Pending | Known packaged barcode test. |
| Greek Yoghurt 1kg | SKU-YOG-1KG | 930000000004 | Manual barcode | Pending | Known manual barcode and SKU fallback test. |
| Milk 2L | SKU-MILK-2L | 930000000002 | Name search | Pending | Search terms: `Milk`, `milk 2l`, `full cream milk`. |
| Greek Yoghurt 1kg | SKU-YOG-1KG | 930000000004 | SKU search | Pending | Confirm SKU fallback lookup. |
| Bananas loose | PRODUCE-BANANA-LOOSE | PLU 4011 | PLU/search fallback | Pending | Confirms non-barcode produce path if needed. |
| Bread loaf | BAKERY-BREAD-LOAF | 930000000010 | Name/barcode fallback | Pending | Confirms bakery packaged item lookup if needed. |

## Unknown Barcode Test

| Unknown Barcode | Result | Notes |
|---|---|---|
| 9999999999999 | Pending | Expected: no-match state, retry path visible, no fake item generated, no movement/history created. |

## Catalogue-to-Workflow Handoff

Validate only existing handoff points. Do not add new workflow tiles. Do not treat every workflow as fully retested.

| Workflow | Item Context Preserved | No Fake Movement Created | Operator Path Clear | Result | Notes |
|---|---|---|---|---|---|
| Stock Count | Pending | Pending | Pending | Pending | Confirm only if scan/search flow can move into Stock Count or if operator manually continues with same item identity. |
| Gap Scan | Pending | Pending | Pending | Pending | Confirm only if scan/search flow can move into Gap Scan or if operator manually continues with same item identity. |
| Replenish | Pending | Pending | Pending | Pending | Confirm only if scan/search flow can move into Replenish or if operator manually continues with same item identity. |
| Expiry Check | Pending | Pending | Pending | Pending | Confirm only if scan/search flow can move into Expiry Check or if operator manually continues with same item identity. |
| Shelf Tickets | Pending | Pending | Pending | Pending | Confirm only if scan/search flow can move into Shelf Tickets or if operator manually continues with same item identity. |

## Scenario Scripts

### Scenario A — Known barcode scan

1. Open `/scan` from Home.
2. Scan or paste `930000000001`.
3. Confirm Coke No Sugar 1.25L appears.
4. Confirm item name, SKU/barcode, stock context, and location/context are readable.
5. Confirm no fake movement/history is created.

Expected result: Pass if the correct item appears clearly and the operator can continue safely.

### Scenario B — Manual barcode entry

1. Open `/scan`.
2. Tap manual search/input.
3. Enter `930000000004` manually.
4. Submit/search.
5. Confirm Greek Yoghurt 1kg appears.

Expected result: Pass if manual input works without scanner hardware.

### Scenario C — Search by item name

1. Open `/scan`.
2. Search for `Greek`, `Milk`, or `Bread`.
3. Confirm matching item appears.
4. Confirm result is tappable/selectable if applicable.

Expected result: Pass if operator can find an item even when barcode scan fails.

### Scenario D — Search by SKU/item code

1. Open `/scan`.
2. Search using `SKU-YOG-1KG` or `GROC-COKE-NS-125`.
3. Confirm matching item appears.

Expected result: Pass if SKU lookup works as a fallback path.

### Scenario E — Unknown barcode

1. Open `/scan`.
2. Enter or scan `9999999999999`.
3. Confirm no-match state appears.
4. Confirm retry path is obvious.
5. Confirm no fake item is generated.

Expected result: Pass if the screen clearly says no item found and gives the operator a safe next step.

### Scenario F — Item handoff to Stock Count

1. Find a known item.
2. Move into Stock Count if the app supports it.
3. Confirm selected item context remains visible.
4. Confirm operator can count or return safely.
5. Confirm no fake count is created before operator action.

Expected result: Pass if item context is preserved and no fake count is created before operator action.

### Scenario G — Refresh stability

1. Open `/scan`.
2. Search or scan a known item.
3. Refresh the browser.
4. Confirm route remains stable.
5. Confirm operator is not trapped.

Expected result: Pass if refresh does not crash or strand the operator.

## Blocker-Only Fix Rule

Only fix during Pilot Run 1 if one of these is found:

| Blocker Condition | Fix Rule |
|---|---|
| Scan route crashes | Fix immediately. |
| Known stock item cannot be found | Fix immediately. |
| Manual barcode entry broken | Fix immediately. |
| Item name/SKU search broken | Fix immediately. |
| Unknown barcode creates fake data | Fix immediately. |
| Result card unreadable or clipped | Fix immediately. |
| Primary action is clipped | Fix immediately. |
| Home escape missing | Fix immediately. |
| Horizontal scrolling appears | Fix immediately. |
| Fake operational records visible | Fix immediately. |
| Selecting item creates fake stock movement/history | Fix immediately. |

Everything else goes into backlog.

## Release Blockers Found

| Blocker | Route | Severity | Fix Required |
|---|---|---|---|
| None found during static package preparation | — | — | No source fix applied. Real-device validation still pending. |

## Non-Blocking Backlog

| Item | Route | Reason Deferred |
|---|---|---|
| Confirm whether Product Lookup should expose clearer workflow continuation actions after item selection | `/product/:id` | Defer unless real-device Pilot Run 1 proves the operator path is unclear. No new workflow tiles/actions were added in this notes-only pack. |
| Confirm exact physical scanner wedge behavior on real hardware | `/scan` | Requires real device; static build cannot prove scanner timing/keyboard behavior. |
| Confirm horizontal scroll/clipping on the target handheld viewport | All in-scope routes | Requires real device or browser viewport evidence screenshots. |

## Pilot Run 1 Decision

- ☐ Pass — proceed to Pilot Run 2
- ☐ Conditional pass — blocker fix pack required
- ☐ Fail — scan/catalogue stability must be fixed first

Current package status:

```text
Prepared for Pilot Run 1 evidence collection.
No app source changes were required during package preparation.
Final decision must be made after real-device scan/catalogue validation.
```

## Files Changed In This Package

```text
Added:
- INVYRA_SCANOPS_PILOT_RUN_1_STOCK_ITEM_CATALOGUE_SCAN_FLOW_VALIDATION_NOTES.md

Unchanged:
- src/App.jsx
- src/pages/Scan.jsx
- src/pages/ProductLookup.jsx
- src/pages/StockCount.jsx
- src/pages/GapScan.jsx
- src/pages/Replenish.jsx
- src/pages/ExpiryCheck.jsx
- src/pages/ShelfTickets.jsx
- src/lib/*
- src/components/scanner/AppEscapeHeader.jsx
```

## Commands Run During Package Preparation

```powershell
npm ci
npm run lint
npm run build
```

Results:

```text
npm ci: Completed. npm reported existing dependency audit warnings; no package files were changed for this Pilot Run 1 pack.
npm run lint: Passed.
npm run build: Passed. Vite generated dist output; Base44 proxy warning was informational because VITE_BASE44_APP_BASE_URL was not set.
```

## Git Commands After ZIP

Notes-only package:

```powershell
git status
git add INVYRA_SCANOPS_PILOT_RUN_1_STOCK_ITEM_CATALOGUE_SCAN_FLOW_VALIDATION_NOTES.md
git commit -m "Add ScanOps Pilot Run 1 stock catalogue scan validation pack"
git pull --rebase
git push
```

If a later blocker fix touches app files, add only the specific changed files:

```powershell
git status
git add INVYRA_SCANOPS_PILOT_RUN_1_STOCK_ITEM_CATALOGUE_SCAN_FLOW_VALIDATION_NOTES.md src/pages/Scan.jsx
git commit -m "Validate ScanOps Pilot Run 1 catalogue scan flow"
git pull --rebase
git push
```
