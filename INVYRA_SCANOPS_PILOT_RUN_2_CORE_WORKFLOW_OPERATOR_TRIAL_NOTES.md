# Invyra ScanOps — Pilot Run 2 Core Workflow Operator Trial Evidence

## Baseline

- Baseline package: `Invyra_ScanOps_PilotRun1_StockItemCatalogueScanFlowValidation_v1.zip`
- Output package: `Invyra_ScanOps_PilotRun2_CoreWorkflowOperatorTrial_v1.zip`
- Date prepared: 2026-05-14
- Device / viewport: Pending real-device test
- Browser: Pending real-device test
- Tester: Pending
- Build command result: Pass — `npm run build` completed and generated `dist/`; Base44 proxy warning shown because `VITE_BASE44_APP_BASE_URL` was not set.
- Lint command result: Pass — `npm run lint` completed with no reported errors.
- Package preparation result: Evidence validation pack. No app source files were changed unless a blocker is listed below.

## Pilot Run 2 Rule

Pilot Run 2 validates core handheld operator workflows only.

This run proves whether a store operator can use real catalogue items inside the existing core workflows with clear item context, reachable actions, safe exit paths, and no fake operational outcomes.

Do not expand the app during this run.

Not allowed:

- New workflow tiles.
- New filters.
- Dashboards.
- Setup wizards.
- Backend/API rebuilds.
- Route-host architecture changes.
- AppEscapeHeader rewrite.
- AS.8 / AS.8.1 navigation reopening.
- Visual redesign.
- Horizontal scrolling.
- Fake operational data seeds.
- Fake receiving, transfer, markdown, waste, sync, task, or collaboration history.
- Fake success messages that look real.
- Removal of real workflow action buttons.
- Removal of internal workflow navigation.

Allowed only when a release blocker is found:

- Small copy/label fix.
- Small clipping fix.
- Small validation guard.
- Small no-fake-success correction.
- Evidence note update.

## Entry Gate From Pilot Run 1

Pilot Run 2 must not be treated as valid unless Pilot Run 1 has at least a pass or conditional pass.

| Check | Result | Notes |
|---|---|---|
| App opens on handheld viewport | Pending real-device validation | Pilot Run 1 static package build passed; physical device validation still required. |
| Home escape visible | Pending real-device validation | Static route review confirms AppEscapeHeader remains route-host owned for scoped routes. |
| `/scan` works | Pending real-device validation | `/scan` route exists. Real scanner/manual input must be verified on device. |
| Known barcode lookup works | Pending real-device validation | Use known barcode test items from Pilot Run 1. |
| Manual barcode entry works | Pending real-device validation | Use manual entry test from Pilot Run 1. |
| Name/SKU search works | Pending real-device validation | Use name/SKU fallback test from Pilot Run 1. |
| Unknown barcode does not create fake data | Pending real-device validation | Test `9999999999999`; no stock movement/history may be created. |
| No horizontal scrolling | Pending real-device validation | Must be checked on handheld viewport. |
| No fake operational history appears | Pending real-device validation | Viewing/selecting must not create movement records. |

If scan/catalogue lookup is still failing, stop and fix Pilot Run 1 first.

## Static Package Pre-Check

| Check | Result | Notes |
|---|---|---|
| Baseline extracted successfully | Pass | Source ZIP opened and package structure was readable. |
| `/scan` route exists | Pass | `src/App.jsx` contains `/scan`. |
| `/stock-count` route exists | Pass | `src/App.jsx` contains `/stock-count`. |
| `/gap-scan` route exists | Pass | `src/App.jsx` contains `/gap-scan`. |
| `/replenish` route exists | Pass | `src/App.jsx` contains `/replenish`. |
| `/expiry-check` route exists | Pass | `src/App.jsx` contains `/expiry-check`. |
| `/shelf-tickets` route exists | Pass | `src/App.jsx` contains `/shelf-tickets`. |
| App-owned Home escape metadata exists for scoped routes | Pass | `getAppEscapeMeta()` contains titles/subtitles for each scoped route. |
| Route-host navigation architecture untouched | Pass | No source files were changed for this evidence pack. |
| Source app files changed | Pass | None. Notes-only package preparation. |
| Lint | Pass | `npm run lint` completed with no reported errors. |
| Build | Pass | `npm run build` completed and generated `dist/`; Base44 proxy warning shown because `VITE_BASE44_APP_BASE_URL` was not set. |

## Routes in Scope

Primary operator workflows:

| Route | Scope |
|---|---|
| `/scan` | Catalogue/scan entry and workflow handoff check. |
| `/stock-count` | Operator count flow. |
| `/gap-scan` | Gap item check/review flow. |
| `/replenish` | Backroom-to-shelf action flow. |
| `/expiry-check` | Freshness/expiry inspection flow. |
| `/shelf-tickets` | Shelf ticket preparation flow. |

Secondary stability checks only:

| Route | Scope |
|---|---|
| `/` or Home launcher | Confirm operator can return safely. |
| `/product/:id` | Confirm item context if scan/search opens product detail. |

Out of scope unless directly blocking a core workflow:

| Route | Deferred Reason |
|---|---|
| `/receiving` | Not part of Run 2 core operator trial. |
| `/transfers` | Not part of Run 2 core operator trial. |
| `/tasks` | Not part of Run 2 core operator trial. |
| `/markdowns` | Not part of Run 2 core operator trial. |
| `/waste` | Not part of Run 2 core operator trial. |
| `/inventory-sync` | Not part of Run 2 core operator trial. |

## Core Workflow Route Checks

| Route | Opens | Home Escape | Item Context Clear | Primary Action Reachable | Cancel/Return Safe | No Horizontal Scroll | Result | Notes |
|---|---|---|---|---|---|---|---|---|
| `/stock-count` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Operator count path. |
| `/gap-scan` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Gap item review/check path. |
| `/replenish` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Replenishment action path. |
| `/expiry-check` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Expiry/freshness inspection path. |
| `/shelf-tickets` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Shelf ticket preparation path. |

## Operator Trial Scenarios

### Scenario A — Home to Stock Count

1. Open app on handheld viewport.
2. Tap Stock Count.
3. Select or search a known item.
4. Enter a count.
5. Confirm action visibility.
6. Cancel or submit.
7. Return Home.

Expected result: Operator can understand what item is being counted, enter a count, and complete or cancel without confusion.

| Check | Result | Notes |
|---|---|---|
| Stock Count opens from Home | Pending | |
| Known catalogue item can be found/selected | Pending | |
| Count input is understandable | Pending | |
| Empty or invalid count is blocked | Pending | |
| Count action is clearly labelled | Pending | |
| Cancel/return path is safe | Pending | |
| No fake completed history appears unless a real local trial action is recorded | Pending | |
| No horizontal scrolling or clipped footer/action button | Pending | |

### Scenario B — Scan to Workflow Handoff

1. Open `/scan`.
2. Find a known item.
3. Use available workflow handoff if present.
4. Confirm the next workflow keeps item context.
5. Confirm no fake movement is created by handoff alone.

Expected result: The selected item remains clear after moving into a workflow.

| Check | Result | Notes |
|---|---|---|
| Known item can be found through scan/manual/search | Pending | |
| Handoff exists or operator can manually continue with same item identity | Pending | Do not add a new handoff unless current path is a blocker. |
| Item context remains visible after handoff/continuation | Pending | |
| No count, transfer, reorder, waste, markdown, print, or sync record is created by handoff alone | Pending | |

### Scenario C — Gap Scan Review

1. Open Gap Scan.
2. Review the visible gap/item context.
3. Confirm action wording.
4. Confirm no fake reorder/shrink history appears.
5. Exit safely.

Expected result: Gap Scan is understandable as an operator check, not a fake automation result.

| Check | Result | Notes |
|---|---|---|
| Gap Scan opens | Pending | |
| Item/gap context is visible | Pending | |
| Primary action is clear | Pending | |
| Viewing/selecting does not create fake reorder/shrink movement | Pending | |
| Exit path is safe | Pending | |
| No horizontal scrolling | Pending | |

### Scenario D — Replenish Action Path

1. Open Replenish.
2. Select or review a known item.
3. Confirm replenishment action is clear.
4. Confirm cancel/back path works.
5. Confirm no fake transfer is created by viewing.

Expected result: Operator understands the action and can leave safely.

| Check | Result | Notes |
|---|---|---|
| Replenish opens | Pending | |
| Item/location needing replenishment is understandable | Pending | |
| Action wording is clear | Pending | |
| No fake transfer/replenishment success appears without operator action | Pending | |
| Complete/cancel path is safe | Pending | |
| No clipped buttons | Pending | |

### Scenario E — Expiry Check Path

1. Open Expiry Check.
2. Review item/date/status context.
3. Confirm action buttons are visible.
4. Confirm no fake markdown/waste action is created automatically.
5. Exit safely.

Expected result: Expiry check remains a clear inspection workflow.

| Check | Result | Notes |
|---|---|---|
| Expiry Check opens | Pending | |
| Item/batch/date context is readable if shown | Pending | |
| Expiry status is readable | Pending | |
| Operator action is clear | Pending | |
| Viewing does not create fake markdown/waste action | Pending | |
| Return path is safe | Pending | |

### Scenario F — Shelf Ticket Path

1. Open Shelf Tickets.
2. Select or confirm a known item.
3. Review ticket options.
4. Confirm ticket action is reachable.
5. Confirm no fake print success is shown as real.
6. Exit safely.

Expected result: Shelf ticket flow is usable without pretending printer infrastructure is implemented.

| Check | Result | Notes |
|---|---|---|
| Shelf Tickets opens | Pending | |
| Known catalogue item can be selected/confirmed | Pending | |
| Ticket size/type options are understandable if present | Pending | |
| Ticket action is reachable | Pending | |
| No fake print success appears unless clearly marked queued/simulated | Pending | |
| Return path is safe | Pending | |

### Scenario G — Refresh and Re-Entry Stability

1. Open each scoped route.
2. Refresh browser.
3. Confirm route does not crash.
4. Confirm Home escape remains available.
5. Confirm operator is not stranded.

Expected result: No route traps the operator after refresh.

| Route | Refresh Safe | Home Escape Still Visible | Operator Not Stranded | Result | Notes |
|---|---|---|---|---|---|
| `/scan` | ☐ | ☐ | ☐ | Pending | |
| `/stock-count` | ☐ | ☐ | ☐ | Pending | |
| `/gap-scan` | ☐ | ☐ | ☐ | Pending | |
| `/replenish` | ☐ | ☐ | ☐ | Pending | |
| `/expiry-check` | ☐ | ☐ | ☐ | Pending | |
| `/shelf-tickets` | ☐ | ☐ | ☐ | Pending | |

## Test Items Used

Use real catalogue items from the Pilot Run 1 test catalogue. Do not add fake operational records.

| Item Name | SKU / Item Code | Barcode / PLU | Workflow Used | Result | Notes |
|---|---|---|---|---|---|
| Coke No Sugar 1.25L | GROC-COKE-NS-125 | 930000000001 | Stock Count | Pending | Known packaged barcode test. |
| Greek Yoghurt 1kg | SKU-YOG-1KG | 930000000004 | Gap Scan | Pending | Known manual barcode and SKU fallback test. |
| Milk 2L | SKU-MILK-2L | 930000000002 | Replenish | Pending | Name search test. |
| Strawberries 250g | PRODUCE-STRAWBERRY-250 | 930000000006 | Expiry Check | Pending | Freshness/expiry context test. |
| Bread loaf | BAKERY-BREAD-LOAF | 930000000010 | Shelf Tickets | Pending | Bakery packaged item lookup test. |
| Bananas loose | PRODUCE-BANANA-LOOSE | PLU 4011 | Optional fallback | Pending | Produce/PLU path if needed. |

## Fake Data / Fake Success Check

| Check | Result | Notes |
|---|---|---|
| No fake receiving history | Pending real-device validation | |
| No fake transfer history | Pending real-device validation | |
| No fake markdown approval | Pending real-device validation | |
| No fake waste review | Pending real-device validation | |
| No fake sync success | Pending real-device validation | |
| No fake task/collaboration history | Pending real-device validation | |
| No fake print success shown as real | Pending real-device validation | Shelf Tickets may show queued/simulated only if clearly labelled. |
| Viewing/selecting item does not create movement history | Pending real-device validation | |
| Unknown barcode does not create fake item | Pending real-device validation | Test `9999999999999`. |

## Blocker-Only Fix Rule

Only fix during Pilot Run 2 if one of these appears:

| Blocker Condition | Fix Rule |
|---|---|
| Route crashes | Fix immediately. |
| Home escape missing | Fix immediately. |
| Workflow cannot be opened | Fix immediately. |
| Operator cannot return Home | Fix immediately. |
| Primary action clipped or unreachable | Fix immediately. |
| Horizontal scrolling appears | Fix immediately. |
| Item context lost after selection/handoff | Fix immediately. |
| Invalid input can be submitted without warning | Fix immediately. |
| Viewing/selecting creates fake operational history | Fix immediately. |
| Fake success message appears as real | Fix immediately. |
| Workflow result unreadable on handheld viewport | Fix immediately. |

Everything else goes into backlog.

## Blockers Found

| Blocker | Route | Severity | Fix Required |
|---|---|---|---|
| None found during static package preparation | — | — | No source fix applied. Real-device/operator validation still pending. |

## Non-Blocking Backlog

| Item | Route | Reason Deferred |
|---|---|---|
| Confirm exact physical scanner wedge timing on real handheld hardware | `/scan` | Requires physical device; static package preparation cannot prove hardware timing. |
| Confirm whether scan/product detail handoff is obvious enough for operators | `/scan`, `/product/:id` | Defer unless Pilot Run 2 operator trial proves the path unclear. Do not add workflow tiles pre-emptively. |
| Confirm shelf ticket output wording on device | `/shelf-tickets` | Only fix if it appears to imply real printer infrastructure or fake successful printing. |
| Confirm count validation edge cases with real operator input | `/stock-count` | Only fix if invalid input can be submitted silently. |

## Pilot Run 2 Decision

- ☐ Pass — proceed to Pilot Run 3
- ☐ Conditional pass — blocker fix pack required
- ☐ Fail — core operator workflow stability must be fixed first

Current package decision: Pending real-device/operator trial. Static preparation is complete and notes-only.

## Commands

Run before final acceptance:

```powershell
npm run lint
npm run build
```

## Git Commands After ZIP

Notes-only version:

```powershell
git status
git add INVYRA_SCANOPS_PILOT_RUN_2_CORE_WORKFLOW_OPERATOR_TRIAL_NOTES.md
git commit -m "Add ScanOps Pilot Run 2 core workflow operator trial pack"
git pull --rebase
git push
```

If blocker files are touched:

```powershell
git status
git add INVYRA_SCANOPS_PILOT_RUN_2_CORE_WORKFLOW_OPERATOR_TRIAL_NOTES.md src/pages/StockCount.jsx src/pages/GapScan.jsx src/pages/Replenish.jsx src/pages/ExpiryCheck.jsx src/pages/ShelfTickets.jsx
git commit -m "Validate ScanOps Pilot Run 2 core operator workflows"
git pull --rebase
git push
```
