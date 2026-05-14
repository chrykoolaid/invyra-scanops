# Invyra ScanOps — Pilot Run 4 Store-Day Simulation Evidence

## Baseline

- Baseline package: `Invyra_ScanOps_PilotRun3_SupervisorExceptionWorkflowTrial_v1.zip`
- Output package: `Invyra_ScanOps_PilotRun4_StoreDaySimulation_v1.zip`
- Date prepared: 2026-05-14
- Device / viewport: Pending real-device store-day simulation
- Browser: Pending real-device store-day simulation
- Tester: Pending
- Dependency install result: Pass — `npm ci` completed from the included lockfile. npm reported existing dependency audit findings; no dependency changes were made in this pack.
- Build command result: Pass — `npm run build` completed; Base44 proxy warning shown because `VITE_BASE44_APP_BASE_URL` was not set.
- Lint command result: Pass — `npm run lint` completed with no reported errors.
- Package preparation result: Evidence validation pack. No app source files were changed unless a Pilot Run 4 release blocker is listed below.

## Pilot Run 4 Rule

Pilot Run 4 validates a realistic short store-day simulation using existing workflows only.

This run proves whether the handheld app can support a normal store-day sequence across lookup, stock count, gap scan, replenishment, expiry review, shelf ticket request, sync/status review, supervisor review, and safe Home return without confusing the operator or inventing operational truth.

No new workflow tiles, filters, dashboards, backend/API work, fake operational data, fake approvals, fake movements, fake reorder decisions, fake print success, fake sync success, fake audit/history, route-host rewrite, AppEscapeHeader rebuild, or app redesign.

## Scope Boundary

Pilot Run 4 is a store-day validation pass.

It is not:

- A new feature stage.
- A dashboard build.
- A reporting build.
- A filter build.
- A backend/API pass.
- An approval engine.
- A fake data seeding pass.
- A workflow redesign.
- A route-host rewrite.

Allowed during this run only when a release blocker is found:

- Evidence notes file.
- Store-day checklist.
- Route-by-route simulation table.
- Small blocker-only correction if simulation cannot continue.
- Copy-only correction where wording falsely implies real completion.

## Store-Day Simulation Model

Pilot Run 4 simulates one controlled store-day flow:

1. Start day / open Home.
2. Scan or search item.
3. Perform Stock Count check.
4. Identify shelf gap.
5. Attempt replenishment.
6. Review expiry item.
7. Request shelf ticket.
8. Check sync/status.
9. Supervisor reviews exception-style outcomes.
10. Return Home safely after each workflow and survive refresh/re-entry.

This is not volume testing. It is flow continuity, clarity, and no fake operational truth.

## Entry Gate

| Check | Result | Notes |
|---|---|---|
| Pilot Run 3 passed or blocker pack completed | Pending real-device validation | Pilot Run 4 package was prepared from the Pilot Run 3 baseline. |
| Home opens safely | Pending real-device validation | Static route review confirms Home is registered at `/`. |
| Scan opens safely | Pending real-device validation | Static route review confirms `/scan` is registered. |
| Stock Count opens safely | Pending real-device validation | Static route review confirms `/stock-count` is registered. |
| Gap Scan opens safely | Pending real-device validation | Static route review confirms `/gap-scan` is registered. |
| Replenish opens safely | Pending real-device validation | Static route review confirms `/replenish` is registered. |
| Expiry Check opens safely | Pending real-device validation | Static route review confirms `/expiry-check` is registered. |
| Shelf Tickets opens safely | Pending real-device validation | Static route review confirms `/shelf-tickets` is registered. |
| Inventory Sync opens safely | Pending real-device validation | Static route review confirms `/inventory-sync` is registered. |
| Home escape visible across scoped routes | Pending real-device validation | Static route review confirms scoped route metadata exists in the app-owned escape header map. |
| No horizontal scrolling | Pending real-device validation | Must be checked on handheld viewport. |

## Static Package Pre-Check

| Check | Result | Notes |
|---|---|---|
| Baseline extracted successfully | Pass | Source ZIP opened and package structure was readable. |
| `/` / Home route exists | Pass | `src/App.jsx` contains Home at `/`. |
| `/scan` route exists | Pass | `src/App.jsx` contains `/scan`. |
| `/stock-count` route exists | Pass | `src/App.jsx` contains `/stock-count`. |
| `/gap-scan` route exists | Pass | `src/App.jsx` contains `/gap-scan`. |
| `/replenish` route exists | Pass | `src/App.jsx` contains `/replenish`. |
| `/expiry-check` route exists | Pass | `src/App.jsx` contains `/expiry-check`. |
| `/shelf-tickets` route exists | Pass | `src/App.jsx` contains `/shelf-tickets`. |
| `/inventory-sync` route exists | Pass | `src/App.jsx` contains `/inventory-sync`. |
| Secondary observation routes exist | Pass | `/receiving`, `/transfers`, `/tasks`, `/markdowns`, and `/waste` are registered. |
| App-owned Home escape metadata exists for scoped routes | Pass | `getAppEscapeMeta()` contains titles/subtitles for the scoped routes. |
| Route-host navigation architecture untouched | Pass | No source files were changed for this evidence pack. |
| Source app files changed | Pass | None. Notes-only package preparation. |
| New workflow tiles added | Pass | None added. |
| New filters added | Pass | None added. |
| New dashboards added | Pass | None added. |
| Backend/API work added | Pass | None added. |
| Lint | Pass | `npm run lint` completed with no reported errors. |
| Build | Pass | `npm run build` completed; Base44 proxy warning shown because `VITE_BASE44_APP_BASE_URL` was not set. |

## Routes in Scope

Primary store-day simulation routes:

| Route | Scope |
|---|---|
| `/` or Home launcher | Start day, safe workflow entry, safe Home return. |
| `/scan` | Scan/search item lookup. |
| `/stock-count` | Count check during store-day flow. |
| `/gap-scan` | Shelf gap check. |
| `/replenish` | Replenishment attempt or review. |
| `/expiry-check` | Expiry/freshness inspection. |
| `/shelf-tickets` | Shelf ticket request or queue honesty. |
| `/inventory-sync` | Sync/status truth check. |

Secondary observation only:

| Route | Scope |
|---|---|
| `/receiving` | Observe only unless directly blocking store-day simulation. |
| `/transfers` | Observe only unless directly blocking store-day simulation. |
| `/tasks` | Observe only unless directly blocking store-day simulation. |
| `/markdowns` | Observe only unless directly blocking store-day simulation. |
| `/waste` | Observe only unless directly blocking store-day simulation. |

Out of scope unless directly blocking store-day simulation:

- New workflow tiles.
- New exception dashboards.
- New supervisor queues.
- Advanced reporting.
- Printer infrastructure.
- Backend sync engine.

## Store-Day Simulation Flow

| Step | Route | Store-Day Action | Result | Notes |
|---|---|---|---|---|
| 1 | `/` | Start day / open Home | Pending | Confirm launcher is clear and no fake dashboard/exception panel was added. |
| 2 | `/scan` | Item lookup | Pending | Confirm lookup does not create fake movement/history. |
| 3 | `/stock-count` | Count check | Pending | Confirm count wording is clear and no fake stock adjustment is silently created. |
| 4 | `/gap-scan` | Shelf gap check | Pending | Confirm no automatic reorder/shrink/movement is created. |
| 5 | `/replenish` | Replenishment attempt | Pending | Confirm no fake transfer or stock movement appears. |
| 6 | `/expiry-check` | Expiry review | Pending | Confirm expiry, markdown, and waste are not merged incorrectly. |
| 7 | `/shelf-tickets` | Shelf ticket request | Pending | Confirm no real print success is claimed without printer infrastructure. |
| 8 | `/inventory-sync` | Sync/status check | Pending | Confirm no backend sync success is falsely claimed. |
| 9 | Scoped routes | Supervisor review | Pending | Confirm exception-style outcomes are understandable without a new dashboard. |
| 10 | All scoped routes | Refresh/re-entry check | Pending | Confirm route does not crash and Home escape remains visible. |

## Route Checks

| Route | Opens | Home Escape | Item Context Clear | Primary Action Reachable | No Fake Outcome | No Horizontal Scroll | Refresh Safe | Result | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/` | ☐ | N/A | N/A | ☐ | ☐ | ☐ | ☐ | Pending | Start-day launcher. |
| `/scan` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Lookup action only. |
| `/stock-count` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Count check / variance understanding. |
| `/gap-scan` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Shelf gap review without fake reorder/shrink. |
| `/replenish` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Replenishment attempt without fake movement. |
| `/expiry-check` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Expiry review without fake markdown/waste approval. |
| `/shelf-tickets` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Ticket request without fake print success. |
| `/inventory-sync` | ☐ | ☐ | N/A | ☐ | ☐ | ☐ | ☐ | Pending | Sync/status honesty. |

## Test Items Used

| Item Name | SKU / Item Code | Barcode | Used In Route | Result | Notes |
|---|---|---|---|---|---|
|  |  |  | `/scan` | Pending | |
|  |  |  | `/stock-count` | Pending | |
|  |  |  | `/gap-scan` | Pending | |
|  |  |  | `/replenish` | Pending | |
|  |  |  | `/expiry-check` | Pending | |
|  |  |  | `/shelf-tickets` | Pending | |

## Fake Operational Truth Check

| Check | Result | Notes |
|---|---|---|
| No fake stock movement | Pending | |
| No fake count approval | Pending | |
| No fake stock adjustment | Pending | |
| No fake reorder decision | Pending | |
| No fake replenishment movement | Pending | |
| No fake markdown approval | Pending | |
| No fake waste approval | Pending | |
| No fake print success | Pending | |
| No fake sync success | Pending | |
| No fake audit history | Pending | |
| No fake seeded store-day activity | Pending | |

## Operator Experience Check

| Check | Result | Notes |
|---|---|---|
| Operator can understand next action | Pending | |
| Operator can return Home after every workflow | Pending | |
| No workflow feels like a dead end | Pending | |
| No filter-heavy UI introduced | Pass for package preparation | No app source changes were made in this notes-only pack. |
| No unnecessary supervisor dashboard introduced | Pass for package preparation | No app source changes were made in this notes-only pack. |
| Button wording is clear | Pending real-device validation | |
| Important actions are not clipped | Pending real-device validation | |

## Pilot Run 4 Test Scenarios

### Scenario A — Store-day opening

1. Open `/`.
2. Confirm app loads cleanly.
3. Confirm core workflow tiles remain visible.
4. Confirm no extra fake dashboard/exception panel was added.
5. Confirm no horizontal scrolling.

Expected result: Operator can start the day from Home without confusion or fake seeded activity.

| Check | Result | Notes |
|---|---|---|
| Home opens | Pending | |
| Core workflow tiles remain visible | Pending | |
| No extra fake dashboard/exception panel | Pending | |
| No horizontal scrolling | Pending | |
| Operator can identify first action | Pending | |

### Scenario B — Item lookup at start of shift

1. Open `/scan`.
2. Search or scan a known stock item.
3. Confirm item identity is clear.
4. Confirm item result does not create fake movement/history.
5. Return Home safely.

Expected result: Item lookup remains a lookup action, not a fake transaction.

| Check | Result | Notes |
|---|---|---|
| Scan opens | Pending | |
| Known item can be found | Pending | |
| Item identity is clear | Pending | |
| No fake movement/history appears | Pending | |
| Home escape remains visible | Pending | |

### Scenario C — Stock count check

1. Open `/stock-count`.
2. Select or search known stock item.
3. Perform count flow if available.
4. Confirm count wording is clear.
5. Confirm no fake stock adjustment is silently created.
6. Return Home safely.

Expected result: Stock Count can be used during the simulated store day without inventing official stock truth.

| Check | Result | Notes |
|---|---|---|
| Stock Count opens | Pending | |
| Known item context is clear | Pending | |
| Count wording is clear | Pending | |
| No fake stock adjustment is created | Pending | |
| Home escape remains visible | Pending | |
| No clipped primary action | Pending | |

### Scenario D — Shelf gap check

1. Open `/gap-scan`.
2. Review or enter shelf-gap context.
3. Confirm item context remains visible.
4. Confirm gap state does not auto-create reorder/shrink/movement.
5. Return Home safely.

Expected result: Gap Scan remains reviewable and does not pretend to complete backend decisions.

| Check | Result | Notes |
|---|---|---|
| Gap Scan opens | Pending | |
| Item/gap context is visible | Pending | |
| No fake reorder appears | Pending | |
| No fake shrink/movement appears | Pending | |
| Home escape remains visible | Pending | |
| No horizontal scrolling | Pending | |

### Scenario E — Replenishment attempt

1. Open `/replenish`.
2. Review item/location context.
3. Attempt or inspect replenishment action state.
4. Confirm wording is honest if incomplete, queued, or simulated.
5. Confirm no fake stock transfer/movement appears.
6. Return Home safely.

Expected result: Replenishment can be trialled without fake inventory movement.

| Check | Result | Notes |
|---|---|---|
| Replenish opens | Pending | |
| Item/location context is visible | Pending | |
| Action wording is honest | Pending | |
| No fake transfer appears | Pending | |
| No fake stock movement appears | Pending | |
| Home escape remains visible | Pending | |

### Scenario F — Expiry check

1. Open `/expiry-check`.
2. Review known expiry item/context.
3. Confirm expiry status is readable.
4. Confirm expiry, markdown, and waste are not merged incorrectly.
5. Confirm no fake markdown/waste approval is created.
6. Return Home safely.

Expected result: Expiry Check remains inspection/review only unless a real workflow exists.

| Check | Result | Notes |
|---|---|---|
| Expiry Check opens | Pending | |
| Item/date/status context is readable | Pending | |
| Expiry state is clear | Pending | |
| Markdown and waste are not auto-created | Pending | |
| Home escape remains visible | Pending | |
| No horizontal scrolling | Pending | |

### Scenario G — Shelf ticket request

1. Open `/shelf-tickets`.
2. Select or search known item.
3. Review ticket size/type options if present.
4. Confirm wording does not claim real print success.
5. Confirm queued/simulated wording is honest.
6. Return Home safely.

Expected result: Shelf Ticket flow is useful without pretending printer infrastructure exists.

| Check | Result | Notes |
|---|---|---|
| Shelf Tickets opens | Pending | |
| Known item can be selected/searched | Pending | |
| Ticket options are reachable | Pending | |
| No fake print success appears | Pending | |
| Queued/simulated wording is honest | Pending | |
| Home escape remains visible | Pending | |

### Scenario H — Inventory sync/status check

1. Open `/inventory-sync`.
2. Confirm sync/status screen opens safely.
3. Confirm wording is honest about local/simulated/pending status.
4. Confirm no fake successful backend sync is claimed.
5. Return Home safely.

Expected result: Inventory Sync does not misrepresent backend truth.

| Check | Result | Notes |
|---|---|---|
| Inventory Sync opens | Pending | |
| Sync/status screen is understandable | Pending | |
| Local/simulated/pending status is honest | Pending | |
| No fake successful backend sync is claimed | Pending | |
| Home escape remains visible | Pending | |

### Scenario I — Supervisor review after store-day flow

1. Revisit scoped workflows as Supervisor.
2. Confirm exception-style outcomes are understandable.
3. Confirm no fake approval/audit/movement history appeared during the store-day simulation.
4. Confirm Supervisor is not forced into unavailable Manager/Admin-only actions.

Expected result: Supervisor can understand the store-day outcomes without a new dashboard or fake exception engine.

| Check | Result | Notes |
|---|---|---|
| Supervisor can revisit scoped workflows | Pending | |
| Exception-style outcomes are understandable | Pending | |
| No fake approval appears | Pending | |
| No fake audit/history appears | Pending | |
| Supervisor is not forced into Manager/Admin-only actions | Pending | |

### Scenario J — Refresh and re-entry stability

1. Visit each primary route.
2. Refresh browser.
3. Confirm route does not crash.
4. Confirm Home escape remains visible.
5. Confirm no user is stranded.

Expected result: The simulated store day survives refresh and route re-entry.

| Check | Result | Notes |
|---|---|---|
| Refresh safe on `/scan` | Pending | |
| Refresh safe on `/stock-count` | Pending | |
| Refresh safe on `/gap-scan` | Pending | |
| Refresh safe on `/replenish` | Pending | |
| Refresh safe on `/expiry-check` | Pending | |
| Refresh safe on `/shelf-tickets` | Pending | |
| Refresh safe on `/inventory-sync` | Pending | |
| Home escape remains visible after refresh | Pending | |

## Blocker Rule

Only block Pilot Run 4 if one of these appears:

- Route crash.
- Home escape missing.
- User cannot return Home.
- Refresh strands the user.
- Horizontal scrolling appears.
- Primary action is clipped or unreachable.
- Item context is missing.
- Workflow wording is misleading.
- Fake movement appears as real.
- Fake approval appears as real.
- Fake reorder appears as real.
- Fake print success appears as real.
- Fake sync success appears as real.
- Fake audit/history appears as real.
- Build fails.
- Lint fails.

Everything else goes to backlog.

## Blockers Found

| Blocker | Route | Severity | Fix Required | Goes To |
|---|---|---|---|---|
| None found during package preparation | N/A | N/A | No source fix required | Pilot Run 4 real-device validation |

## Non-Blocking Backlog

| Item | Route | Why Deferred |
|---|---|---|
| Real handheld viewport pass | All scoped routes | Must be verified on actual device/viewport, not assumed from static package review. |
| Store-day test item list completion | Scoped item routes | Tester must fill with the actual stock items used during Pilot Run 4. |
| Browser refresh proof screenshots | All scoped routes | Requires interactive browser/device testing. |

## Pilot Run 4 Decision

- ☐ Pass — proceed to Pilot Run 5
- ☐ Conditional pass — Pilot Fix Pack 2 required
- ☐ Fail — store-day simulation stability must be fixed first

Current preparation decision:

- ☑ Package prepared for Pilot Run 4 real-device store-day simulation.
- ☑ Notes-first approach preserved.
- ☑ No source files changed.
- ☑ No new workflow tiles, filters, dashboards, fake data, fake approvals, fake movement, fake print success, fake sync success, or route-host changes added.
