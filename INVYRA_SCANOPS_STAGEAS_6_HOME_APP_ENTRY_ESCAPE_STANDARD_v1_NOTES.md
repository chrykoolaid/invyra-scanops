# Invyra ScanOps — Stage AS.6 Home App Entry Escape Standard v1

## Status

Stage AT Pilot Release Lock remains BLOCKED until this build is preview-tested successfully.

AS.4 and AS.5 are not accepted because the visible `/scan` operator surface still had no app-owned Home escape path. AS.6 widens the blocker from a single `/scan` route problem to a Home launcher app-entry contract.

## Problem fixed

Any app opened from the Home launcher can trap the operator if the visible app/workflow screen has no app-owned Home button. This is unacceptable for a handheld pilot because operators must never depend on browser chrome, browser back, refresh state, or URL editing to return to the Home launcher.

## Locked rule introduced

Every workflow/app launched from the Home screen must show exactly one visible app-owned Home button inside the app UI.

The Home button must:

- Be visible immediately after entering the app/workflow.
- Navigate directly to `/`.
- Not depend on browser history.
- Work after direct URL load.
- Work after refresh.
- Work when the workflow has no selected item or empty state.
- Not duplicate with Back/Home controls.
- Not appear on the Home launcher itself.

## Wireframe contract

Every Home-launched app must start with this structure:

```text
[Home icon]  Workflow Title
             Optional helper text

Actual workflow content starts here
```

For `/scan`, the required visible result is:

```text
[Home icon]  Product Lookup
             Scan or search item details

Search / scan item, PLU, SKU, barcode...
No item selected.
```

## Implementation notes

This pass does not add a floating global escape bar and does not reintroduce duplicate navigation. It also does not depend on browser history.

AS.6 places the Home escape into the actual route-owned visible path for Home-launched apps by rendering `PageHeader` directly at the top of those route pages. For pages that use `WorkflowHeader` primarily as the scan/search input, AS.6 sets `showHeaderChrome={false}` so the search field remains visible while the single route-owned `PageHeader` owns the Home button, title, helper text, and sync chip.

## Files updated

- `src/pages/Scan.jsx`
- `src/pages/StockCount.jsx`
- `src/pages/Receiving.jsx`
- `src/pages/Replenish.jsx`
- `src/pages/GapScan.jsx`
- `src/pages/Markdowns.jsx`
- `src/pages/Waste.jsx`
- `src/pages/ExpiryCheck.jsx`
- `src/pages/ShelfTickets.jsx`
- `src/pages/Transfers.jsx`
- `INVYRA_SCANOPS_STAGEAS_6_HOME_APP_ENTRY_ESCAPE_STANDARD_v1_NOTES.md`

## Files inspected / intentionally not broadly rebuilt

- `src/App.jsx`
- `src/pages/Home.jsx`
- `src/pages/Tasks.jsx`
- `src/pages/SyncQueue.jsx`
- `src/components/scanner/PageHeader.jsx`
- `src/components/scanner/WorkflowHeader.jsx`

## Home launcher route coverage

The current Home launcher routes are:

- `/scan`
- `/stock-count`
- `/receiving`
- `/replenish`
- `/gap-scan`
- `/tasks`
- `/markdowns`
- `/waste`
- `/expiry-check`
- `/shelf-tickets`
- `/transfers`
- `/inventory-sync`

AS.6 ensures each of these routes has a route-owned visible Home escape through either a newly added `PageHeader` or an existing `PageHeader` already present in the actual page component.

## Out of scope

- No new workflow tiles.
- No filters.
- No dashboards.
- No setup wizard.
- No backend/API work.
- No printer routing.
- No role redesign.
- No sync logic changes.
- No Home launcher redesign.
- No major shell rewrite.

## Acceptance tests

1. Open `/` directly.
2. Confirm the Home launcher does not show a duplicate Home button.
3. Open every Home launcher app one by one.
4. Confirm each app shows exactly one visible Home button inside the app UI.
5. Confirm the Home button appears before/above the main workflow content.
6. Tap Home.
7. Confirm it navigates directly to `/`.
8. Open each app route directly from the URL.
9. Refresh each app route.
10. Confirm the Home button still appears.
11. Confirm no app has duplicate Back + Home controls.
12. Confirm `/scan` specifically shows Home above the search/scan bar.
13. Confirm empty states still show Home.
14. Confirm selected-item states still show Home.
15. `npm run lint` passes.
16. `npm run build` passes.

## Release lock

Stage AT remains blocked until this AS.6 build is preview-tested and the visible Home escape is confirmed on every Home-launched app entry.
