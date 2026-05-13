# Invyra ScanOps — Stage AS.5 Scan Route Real Home Escape Fix v1

## Status
Release-candidate navigation blocker fix for `/scan`.

Stage AT Pilot Release Lock remains blocked until this build is preview-tested successfully.

## Problem confirmed
AS.4 added a route-level/page header path, but the `/scan` screen the operator actually sees is rendered through `WorkflowHeader` with `showHeaderChrome={false}`. That meant the visible search/scan bar could still appear without an app-owned Home escape in the actual rendered path.

## Fix applied
`src/pages/Scan.jsx` now uses the real visible `/scan` workflow header as the route header:

- Removed the separate `/scan` `PageHeader` wrapper.
- Removed `showHeaderChrome={false}` from `/scan`.
- The visible `WorkflowHeader` now renders exactly one app-owned Home button, title, sync state, and search/scan bar.
- Home uses `navigate("/")`, so it does not depend on browser history.
- The fix is route-specific to `/scan` and does not add a global escape bar.

`src/components/scanner/PageHeader.jsx` was minimally hardened to support `showHome = true` while preserving current behavior for existing PageHeader users.

## Files changed
- `src/pages/Scan.jsx`
- `src/components/scanner/PageHeader.jsx`
- `INVYRA_SCANOPS_STAGEAS_5_SCAN_ROUTE_REAL_HOME_ESCAPE_FIX_v1_NOTES.md`

`src/components/scanner/WorkflowHeader.jsx` was inspected but not changed.

## Visible `/scan` target
Expected visible order on direct `/scan` load:

```text
[Home icon] Product Lookup
Scan, PLU, SKU, shelf label, or name
Search / scan item, PLU, SKU, barcode...
No item selected.
```

## Out of scope respected
No new workflow tiles, filters, dashboards, setup wizards, backend/API work, printer routing, role redesign, sync redesign, or home launcher redesign were added.

## Acceptance tests to run in preview
1. Open `/scan` directly.
2. Confirm one visible Home icon/button appears inside the app UI.
3. Tap Home from `/scan`.
4. Confirm it navigates to `/`.
5. Refresh `/scan`.
6. Confirm Home still appears.
7. Confirm `/scan` has no duplicate Back/Home controls.
8. Confirm `/gap-scan` still has exactly one Home control.
9. Confirm `/stock-count` still has exactly one Home control.
10. Confirm `/receiving` still has exactly one Home control.
11. Confirm `/transfers` still has exactly one Home control.
12. Confirm Home route `/` does not show duplicate Home navigation.
13. Confirm `npm run lint` passes.
14. Confirm `npm run build` passes.
15. Keep Stage AT blocked until preview-tested successfully.

## Local validation performed
- `npm ci --ignore-scripts`
- `npm run lint` — passed
- `npm run build` — passed
