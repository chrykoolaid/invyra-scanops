# Invyra ScanOps — Pilot Run 0 Real Device Validation Evidence

## Baseline

- Baseline package: `Invyra_ScanOps_StageAT_1_PilotDataHygiene_v1.zip`
- Output package: `Invyra_ScanOps_PilotRun0_RealDeviceValidationEvidence_v1.zip`
- Date prepared: 2026-05-14
- Device / viewport: Pending real handheld validation
- Browser: Pending real handheld validation
- Tester: Pending real handheld validation
- Local build environment: container validation only, not a physical handheld
- Build command result: `npm run build` passed
- Lint command result: `npm run lint` passed

## Pilot Run 0 Rule

Pilot Run 0 is an evidence and validation pass only.

No new workflows, filters, dashboards, setup wizard, backend rebuild, route-host rewrite, navigation rewrite, dependency upgrades, or fake operational seed restoration.

## Scope Lock Carried Forward

- Stage AT release lock remains active.
- Stage AT.1 pilot data hygiene remains active.
- AS.8 / AS.8.1 navigation remains locked.
- Stock catalogue items may remain available for scan/search testing.
- Fake operational history, fake queue work, fake backend acceptance, fake remote users, and fake completion states must not appear as live truth.

## Code Preflight Result

| Check | Result | Notes |
|---|---|---|
| Home-launched route list exists | Passed | Home launcher includes the 12 Pilot Run 0 operational workflow tiles. |
| App-owned Home escape shell exists | Passed | Non-home routes receive the shared `AppEscapeHeader` from the route host. |
| Legacy route Home buttons guarded | Passed | Legacy `PageHeader` / `WorkflowHeader` home chrome is hidden while the app escape header is active. |
| Scope stayed evidence-only | Passed | No app workflow files were changed during this pass. |
| Package validation commands | Passed | `npm ci --no-audit --no-fund`, `npm run lint`, and `npm run build` completed successfully. |

## Route Validation Table

Use this table on the real handheld or a matching mobile viewport. Do not mark real-device Pass until the route has been physically checked.

| Route | Opens | Home Escape | No Duplicate Escape | No Horizontal Scroll | Refresh Stable | Main Action Reachable | Result | Notes |
|---|---|---|---|---|---|---|---|---|
| `/` | ☐ | N/A | ☐ | ☐ | ☐ | ☐ | Pending | Home launcher route. Confirm 12 workflow tiles are visible/reachable. |
| `/scan` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Product Lookup / core scanner flow. |
| `/gap-scan` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Shelf-gap capture flow. |
| `/stock-count` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Count / variance workflow. |
| `/receiving` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Observe-only receiving evidence flow. |
| `/transfers` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Observe-only transfer flow. |
| `/replenish` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Backroom-to-shelf execution flow. |
| `/tasks` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Confirm clean empty state if no created tasks exist. |
| `/markdowns` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Observe-only markdown governance flow. |
| `/waste` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Observe-only waste/shrink evidence flow. |
| `/expiry-check` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Freshness / expiry capture flow. |
| `/shelf-tickets` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Observe-only shelf-ticket handoff flow. |
| `/inventory-sync` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Pending | Sync visibility / supervisor confidence flow. |

## Data Hygiene Validation

| Check | Result | Notes |
|---|---|---|
| Stock catalogue available for testing | Pending | Allowed. Needed for scan/search and count validation. |
| Product lookup/search works with stock test items | Pending | Test using known pilot stock items only. |
| Tasks starts empty | Pending | No fake operational tasks should appear. |
| Receiving has no fake exceptions | Pending | No fake receiving exceptions should appear as live work. |
| Transfers has no fake issues | Pending | No fake transfer issues should appear as live work. |
| Waste has no fake reviews | Pending | No fake waste review queue should appear. |
| Markdowns has no fake approvals | Pending | No fake markdown approval queue should appear. |
| Shelf Tickets has no fake print queue | Pending | Print tasks should appear only if created through workflow. |
| Collaboration has no fake remote users | Pending | No fake remote users/devices should appear by default. |
| Sync does not fake backend success | Pending | Sync must not imply successful desktop/backend acceptance unless real. |

## Workflow Pilot Classification

| Workflow | Classification | Reason |
|---|---|---|
| Product Lookup | Pilot Active | Core scanner flow. |
| Stock Count | Pilot Active | Core inventory flow. |
| Gap Scan | Pilot Active | Core Invyra gap workflow. |
| Replenish | Pilot Active | Store-floor execution value. |
| Expiry Check | Pilot Active | Strong pilot value and clear operator action. |
| Tasks | Pilot Active / Pending | Active only if empty-state clarity passes on device. |
| Inventory Sync | Supervisor / Pilot Active | Needed for confidence, but must avoid fake success language. |
| Receiving | Observe Only | Delivery/evidence flow is sensitive. |
| Transfers | Observe Only | Location and permission-sensitive. |
| Markdowns | Observe Only | Pricing-sensitive. |
| Waste | Observe Only | Shrink/waste-sensitive. |
| Shelf Tickets | Observe Only | Printing handoff risk. |

## Evidence Capture Checklist

For each route, capture at least one screenshot proving:

- Route loaded on the handheld/mobile viewport.
- Home escape is visible on workflow routes.
- Home escape returns to `/`.
- No duplicate Back + Home route escape controls are visible.
- No horizontal scrolling is present.
- Main operator action is visible or reachable by normal vertical scroll.
- Footer or primary action is not clipped.
- Empty state is honest and does not show fake operational work.
- Route remains stable after refresh.
- Operator can understand the screen within 3 seconds.

## Blocker-Only Fix Rule

Only fix these during Pilot Run 0:

- Missing Home escape.
- Duplicate Back/Home route escape controls.
- Route crash or blank route.
- Horizontal scrolling.
- Clipped primary action.
- Clipped footer action.
- Fake operational data still visible.
- Broken empty state.
- Operator cannot identify the main action.
- Refresh breaks the route.

Everything else goes into the post-pilot backlog.

## Release Blockers Found

| Blocker | Route | Severity | Fix Required |
|---|---|---|---|
| None found during local code/build preflight | N/A | N/A | Real-device validation still pending. |

## Non-Blocking Backlog

| Item | Route | Reason Deferred |
|---|---|---|
| Real handheld screenshot evidence still required | All Pilot Run 0 routes | This pass prepared the evidence pack and local build validation; physical device testing must still be recorded. |

## Local Command Evidence

```text
npm ci --no-audit --no-fund
Result: passed

npm run lint
Result: passed

npm run build
Result: passed
Note: Base44 proxy message appeared because VITE_BASE44_APP_BASE_URL was not set in the local container environment; build exit code was 0.
```

## Pilot Run 0 Decision

- ☐ Pass — proceed to Pilot Run 1
- ☐ Conditional pass — blocker fix pack required
- ☐ Fail — route/device stability must be fixed first

Recommended current status:

```text
Conditional pending real-device evidence.
```

Reason:

```text
The source package passes local lint/build and the evidence file is ready, but real handheld route screenshots and data hygiene observations have not yet been marked in the evidence table.
```
