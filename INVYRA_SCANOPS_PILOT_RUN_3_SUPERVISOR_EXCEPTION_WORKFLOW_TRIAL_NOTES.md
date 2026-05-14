# Invyra ScanOps — Pilot Run 3 Supervisor / Exception Workflow Trial Evidence

## Baseline

- Baseline package: `Invyra_ScanOps_PilotRun2_CoreWorkflowOperatorTrial_v1.zip`
- Output package: `Invyra_ScanOps_PilotRun3_SupervisorExceptionWorkflowTrial_v1.zip`
- Date prepared: 2026-05-14
- Device / viewport: Pending real-device supervisor trial
- Browser: Pending real-device supervisor trial
- Tester: Pending
- Build command result: Pass — `npm run build` completed; Base44 proxy warning shown because `VITE_BASE44_APP_BASE_URL` was not set.
- Lint command result: Pass — `npm run lint` completed with no reported errors.
- Package preparation result: Evidence validation pack. No app source files should be changed unless a Pilot Run 3 release blocker is listed below.

## Pilot Run 3 Rule

Pilot Run 3 validates supervisor exception review only.

This run proves whether a Supervisor can review exception-style handheld workflow outcomes, understand what needs attention, take safe supervisor actions, and avoid fake operational decisions.

No new workflow tiles, filters, dashboards, backend rebuild, fake exceptions, fake approvals, fake movements, fake reorder decisions, fake markdown/waste approvals, fake print success, or route-host rewrite.

## Scope Boundary

Pilot Run 3 is an exception workflow validation pass.

It is not:

- A dashboard build.
- A new workflow tile stage.
- A backend exception engine.
- An approval engine.
- A reporting module.
- A filter-heavy supervisor console.
- A fake seeded exception pack.

Allowed during this run only when a release blocker is found:

- Evidence notes file.
- Small blocker-only copy fix.
- Small blocker-only validation guard.
- Small blocker-only clipped button fix.
- Small blocker-only fake-success wording correction.
- Small blocker-only role label clarification.

## Entry Gate From Pilot Run 2

Pilot Run 3 must not be treated as valid unless Pilot Run 2 has at least a pass or conditional pass.

| Check | Result | Notes |
|---|---|---|
| Stock Count opens safely | Pending real-device validation | Pilot Run 2 package contains `/stock-count`; real handheld check still required. |
| Gap Scan opens safely | Pending real-device validation | Pilot Run 2 package contains `/gap-scan`; real handheld check still required. |
| Replenish opens safely | Pending real-device validation | Pilot Run 2 package contains `/replenish`; real handheld check still required. |
| Expiry Check opens safely | Pending real-device validation | Pilot Run 2 package contains `/expiry-check`; real handheld check still required. |
| Shelf Tickets opens safely | Pending real-device validation | Pilot Run 2 package contains `/shelf-tickets`; real handheld check still required. |
| Home escape visible | Pending real-device validation | Static route review confirms scoped routes are registered in the app-owned escape header metadata. |
| No horizontal scrolling | Pending real-device validation | Must be checked on handheld viewport. |
| No fake operational history appears | Pending real-device validation | Viewing/selecting must not create fake movement, approval, reorder, markdown, waste, or print outcomes. |

If Pilot Run 2 core workflow operation is still failing, stop and fix Pilot Run 2 first.

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
| `/home` / launcher route exists | Pass | Home launcher is available at `/`. |
| `/inventory-sync` route exists | Pass | Secondary stability route exists. |
| App-owned Home escape metadata exists for scoped routes | Pass | `getAppEscapeMeta()` contains titles/subtitles for each scoped route. |
| Route-host navigation architecture untouched | Pass | No source files were changed for this evidence pack. |
| Source app files changed | Pass | None. Notes-only package preparation. |
| Lint | Pass | `npm run lint` completed with no reported errors. |
| Build | Pass | `npm run build` completed; Base44 proxy warning shown because `VITE_BASE44_APP_BASE_URL` was not set. |

## Routes in Scope

Primary supervisor exception review routes:

| Route | Scope |
|---|---|
| `/stock-count` | Count variance / review-state understanding. |
| `/gap-scan` | Shelf gap exception understanding. |
| `/replenish` | Incomplete or blocked replenishment understanding. |
| `/expiry-check` | Near-expiry or expired item review. |
| `/shelf-tickets` | Shelf ticket request/queue honesty. |

Support route:

| Route | Scope |
|---|---|
| `/scan` | Item lookup and context handoff support. |

Secondary stability checks only:

| Route | Scope |
|---|---|
| `/` or Home launcher | Confirm supervisor can return safely. |
| `/inventory-sync` | Confirm sync-state screen does not strand supervisor if reviewed during exception checks. |

Out of scope unless directly blocking supervisor exception review:

| Route | Deferred Reason |
|---|---|
| `/receiving` | Not part of Run 3 supervisor exception trial. |
| `/transfers` | Not part of Run 3 supervisor exception trial. |
| `/tasks` | Not part of Run 3 supervisor exception trial. |
| `/markdowns` | Not part of Run 3 supervisor exception trial. |
| `/waste` | Not part of Run 3 supervisor exception trial. |

## Supervisor Exception Route Checks

| Route | Opens | Home Escape | Item Context Clear | Supervisor Review Clear | Primary Action Reachable | No Fake Outcome | No Horizontal Scroll | Result | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/stock-count` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Count variance review path. |
| `/gap-scan` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Gap exception review path. |
| `/replenish` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Blocked/incomplete replenishment review path. |
| `/expiry-check` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Expiry risk review path. |
| `/shelf-tickets` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Ticket request review path. |

## Supervisor Trial Scenarios

### Scenario A — Supervisor opens Stock Count exception

1. Open Stock Count.
2. Select or review a known catalogue item.
3. Trigger or inspect count review state if available.
4. Confirm item identity is clear.
5. Confirm supervisor action wording is clear.
6. Confirm no fake stock adjustment is created automatically.
7. Return Home safely.

Expected result: Supervisor can review the count issue without fake inventory mutation.

| Check | Result | Notes |
|---|---|---|
| Stock Count opens | Pending | |
| Known catalogue item can be found/selected | Pending | |
| Count or variance context is understandable if shown | Pending | |
| Supervisor action wording is clear | Pending | |
| No fake count approval appears | Pending | |
| No fake stock adjustment is created automatically | Pending | |
| No fake completed audit history appears from viewing | Pending | |
| Home escape remains visible | Pending | |
| No horizontal scrolling or clipped primary action | Pending | |

### Scenario B — Supervisor reviews Gap Scan issue

1. Open Gap Scan.
2. Review visible item/gap context.
3. Confirm action wording.
4. Confirm no fake reorder/shrink/movement record appears.
5. Exit safely.

Expected result: Gap Scan issue is understandable as a reviewable exception.

| Check | Result | Notes |
|---|---|---|
| Gap Scan opens | Pending | |
| Item/gap context is visible | Pending | |
| Reason/context is visible if captured | Pending | |
| Supervisor can distinguish review from automatic reorder | Pending | |
| No fake reorder decision appears | Pending | |
| No fake shrink, transfer, or replenishment record appears | Pending | |
| Home escape remains visible | Pending | |
| No horizontal scrolling | Pending | |

### Scenario C — Supervisor reviews Replenishment issue

1. Open Replenish.
2. Review item/location context.
3. Confirm blocked/incomplete/needs-review wording if present.
4. Confirm no fake transfer or replenishment success appears.
5. Cancel or return safely.

Expected result: Supervisor can understand the replenishment issue without fake movement history.

| Check | Result | Notes |
|---|---|---|
| Replenish opens | Pending | |
| Item/location context is visible | Pending | |
| Incomplete/blocked wording is clear if present | Pending | |
| Supervisor action wording is clear | Pending | |
| No fake transfer is created automatically | Pending | |
| No fake stock movement is created automatically | Pending | |
| Cancel/return path is safe | Pending | |
| No horizontal scrolling or clipped action | Pending | |

### Scenario D — Supervisor reviews Expiry issue

1. Open Expiry Check.
2. Review item/date/status context.
3. Confirm expiry state is readable.
4. Confirm markdown/waste decisions are not auto-created.
5. Exit safely.

Expected result: Expiry exception remains an inspection/review workflow.

| Check | Result | Notes |
|---|---|---|
| Expiry Check opens | Pending | |
| Item/date/status context is readable | Pending | |
| Expiry state is clear | Pending | |
| Expiry, markdown, and waste are not mixed together | Pending | |
| No fake markdown approval appears | Pending | |
| No fake waste approval appears | Pending | |
| Home escape remains visible | Pending | |
| No horizontal scrolling | Pending | |

### Scenario E — Supervisor reviews Shelf Ticket request

1. Open Shelf Tickets.
2. Select or review a known item.
3. Confirm ticket request/action state.
4. Confirm no fake print success appears as real.
5. Exit safely.

Expected result: Shelf ticket flow is honest about request/queue state.

| Check | Result | Notes |
|---|---|---|
| Shelf Tickets opens | Pending | |
| Item context is visible | Pending | |
| Ticket type/size options are understandable if present | Pending | |
| Request/queue wording is honest | Pending | |
| No fake print success appears as real | Pending | |
| Home escape remains visible | Pending | |
| No horizontal scrolling or clipped action | Pending | |

### Scenario F — Role clarity check

1. Review scoped routes as Supervisor.
2. Confirm any supervisor wording is clear.
3. Confirm Staff-only wording does not appear incorrectly.
4. Confirm no hidden Manager/Admin-only action is exposed as required.

Expected result: Supervisor role feels appropriate without needing a full RBAC rebuild.

| Check | Result | Notes |
|---|---|---|
| Supervisor role can access scoped routes needed for review | Pending | |
| Staff-only wording does not appear incorrectly | Pending | |
| Manager/Admin-only actions are not required for this run | Pending | |
| No full RBAC rebuild is needed | Pending | |

### Scenario G — Refresh and re-entry stability

1. Open each scoped route.
2. Refresh browser.
3. Confirm route does not crash.
4. Confirm Home escape remains available.
5. Confirm operator/supervisor is not stranded.

Expected result: No scoped route traps the Supervisor after refresh.

| Route | Refresh Result | Home Escape After Refresh | Notes |
|---|---|---|---|
| `/scan` | Pending | Pending | |
| `/stock-count` | Pending | Pending | |
| `/gap-scan` | Pending | Pending | |
| `/replenish` | Pending | Pending | |
| `/expiry-check` | Pending | Pending | |
| `/shelf-tickets` | Pending | Pending | |

## Test Items Used

Use real catalogue stock items retained for testing. Do not create fake exception packs.

| Item Name | SKU / Item Code | Barcode | Exception Type | Result | Notes |
|---|---|---|---|---|---|
|  |  |  | Count variance | Pending | |
|  |  |  | Gap issue | Pending | |
|  |  |  | Replenishment issue | Pending | |
|  |  |  | Expiry issue | Pending | |
|  |  |  | Shelf ticket request | Pending | |

## Fake Exception / Fake Approval Check

| Check | Result | Notes |
|---|---|---|
| No fake count approval | Pending | |
| No fake stock adjustment | Pending | |
| No fake reorder decision | Pending | |
| No fake replenishment movement | Pending | |
| No fake markdown approval | Pending | |
| No fake waste approval | Pending | |
| No fake print success | Pending | |
| No fake audit history | Pending | |
| Viewing/selecting does not create fake exception history | Pending | |
| Viewing/selecting does not create fake movement history | Pending | |

## Blocker-Only Fix Rule

Only fix during Pilot Run 3 if one of these appears:

- Route crashes.
- Home escape missing.
- Supervisor cannot return Home.
- Primary action is clipped or unreachable.
- Horizontal scrolling appears.
- Item context is lost.
- Supervisor action wording is unreadable or misleading.
- Viewing/selecting creates fake exception history.
- Viewing/selecting creates fake movement history.
- Fake approval appears as real.
- Fake print/reorder/markdown/waste success appears as real.
- Refresh strands the user.

Everything else goes into backlog.

## Blockers Found

| Blocker | Route | Severity | Fix Required |
|---|---|---|---|
| None during static package preparation | Scoped routes | None | No source changes made. Real-device supervisor trial still required. |

## Non-Blocking Backlog

| Item | Route | Reason Deferred |
|---|---|---|
| Real-device supervisor exception walkthrough evidence | Scoped routes | Requires handheld/browser testing after package handoff. |
| Confirm no horizontal scrolling under actual scanner viewport | Scoped routes | Static package build cannot prove physical viewport behavior. |
| Confirm no fake outcome appears after live interaction | Scoped routes | Requires manual workflow interaction using retained stock catalogue items. |

## Pilot Run 3 Decision

- ☐ Pass — proceed to Pilot Run 4
- ☐ Conditional pass — blocker fix pack required
- ☐ Fail — supervisor exception workflow stability must be fixed first

Current preparation decision: **Pending real-device supervisor trial**.

Static package result: **Prepared as notes-only evidence pack. No app source files changed.**
