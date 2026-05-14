# Invyra ScanOps Pilot Run 0 — Real Device Validation + Evidence Pack v1

Baseline used: `Invyra_ScanOps_StageAT_1_PilotDataHygiene_v1.zip`

## Purpose

Pilot Run 0 is an evidence pass, not a feature stage. The goal is to prove the locked ScanOps app can be opened, used, escaped back to Home, and understood on a real handheld/mobile viewport before any pilot-store release.

## Hard scope lock

- No new workflow tiles.
- No new filters.
- No dashboard or command-center work.
- No setup wizard.
- No backend/API rebuild.
- No route-host rewrite.
- No AppEscapeHeader/navigation reopening.
- No dependency upgrade.
- No fake operational seed restoration.

## Baseline confirmations carried forward

- AS.8.1 navigation remains locked: each workflow route should use one app-owned top Home escape and no duplicate route-level Back + Home controls.
- Stage AT release lock remains active: pilot-facing copy should avoid implementation/debug wording.
- Stage AT.1 data hygiene remains active: stock item test catalogue is allowed, but fake operational work/history must not auto-populate queues.

## Pilot workflow classification — first-pass recommendation

| Route | Workflow | Pilot status | Reason |
|---|---|---|---|
| `/scan` | Product Lookup | Pilot Active | Core handheld scanning and item lookup. |
| `/gap-scan` | Gap Scan | Pilot Active | Key shelf-gap execution workflow. |
| `/stock-count` | Stock Count | Pilot Active | Core inventory validation workflow. |
| `/replenish` | Replenish | Pilot Active | Strong floor/backroom value with simple operator flow. |
| `/expiry-check` | Expiry Check | Pilot Active | Strong fresh-food pilot value. |
| `/inventory-sync` | Inventory Sync | Pilot Active / Supervisor | Needed for pilot confidence and sync visibility. |
| `/tasks` | Tasks | Pilot Active if empty-state remains simple | Useful queue, but should not show fake tasks. |
| `/receiving` | Receiving | Observe Only | Valuable, but should be watched for delivery/evidence complexity. |
| `/transfers` | Transfers | Observe Only | Needs location/approval proof before broad pilot use. |
| `/markdowns` | Markdowns | Observe Only | Sensitive workflow; needs governance validation. |
| `/waste` | Waste | Observe Only | Sensitive shrink/waste workflow; requires controlled pilot. |
| `/shelf-tickets` | Shelf Tickets | Observe Only | Printing handoff must be watched carefully. |

## Route validation checklist

Use this table during real device testing. Do not mark Pass until verified on the actual handheld viewport or a matching mobile viewport.

| Route | Opens from Home | Home escape visible | Returns to Home | No duplicate Back/Home | No horizontal scroll | Main action reachable | Honest empty state/no fake work | Refresh stable | Result |
|---|---|---|---|---|---|---|---|---|---|
| `/scan` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| `/gap-scan` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| `/stock-count` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| `/receiving` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| `/transfers` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| `/replenish` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| `/tasks` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| `/markdowns` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| `/waste` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| `/expiry-check` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| `/shelf-tickets` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| `/inventory-sync` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

## Data hygiene verification checklist

- Product Lookup can still scan/search the controlled pilot stock catalogue.
- Stock Count can still use pilot stock catalogue items.
- Tasks opens with no fake operational task queue.
- Receiving does not show fake receiving exceptions as if they were real work.
- Transfers does not show fake transfer issues as if they were real work.
- Markdowns does not show fake approval work as if it were real work.
- Waste does not show fake review items as if they were real work.
- Collaboration does not show fake remote users or fake remote device history by default.
- Inventory Sync does not report fake desktop acceptance or fake successful sync.
- Any test fixture language remains clearly pilot/test/training language, not live operational truth.

## Evidence to capture during Pilot Run 0

For each tested route, capture one screenshot showing:

1. Route loaded on handheld/mobile viewport.
2. Top Home escape visible.
3. Main operator action visible or reachable by normal vertical scroll.
4. Empty state or task state, proving no fake operational records are present.
5. After tapping Home, launcher is reachable again.

## Blocker definition

Only the following issues should trigger a code fix during Pilot Run 0:

- Missing Home escape on a workflow route.
- Duplicate route-level Back/Home escape controls.
- Route crash or blank route.
- Horizontal scrolling.
- Clipped primary action or footer action.
- Fake operational records still visible by default.
- Confusing empty state that makes an operator think work already exists.
- Impossible operator flow where the user cannot complete or exit the task.

All other findings should go to the post-pilot backlog.

## Known non-blocking notes

- Stock item catalogue remains intentionally available for pilot/test scan validation.
- Some advanced/admin routes still exist in the codebase, but Pilot Run 0 focuses on Home-launched operational workflows only.
- Receiving, transfers, markdowns, waste, and shelf tickets should be observed carefully before being considered fully active pilot workflows.

## Local validation result

- `npm ci --no-audit --no-fund`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Build note: Base44 proxy message appeared because `VITE_BASE44_APP_BASE_URL` was not set in the local container environment; build exit code was `0`.

## Pilot Run 0 acceptance gate

Pilot Run 0 is accepted only when:

- All 12 Home-launched workflow routes pass the route checklist.
- No fake operational seed work appears by default.
- Operators can always return to Home.
- No horizontal scrolling is observed.
- Only blocker-level issues are fixed.
- No new feature scope is introduced.
