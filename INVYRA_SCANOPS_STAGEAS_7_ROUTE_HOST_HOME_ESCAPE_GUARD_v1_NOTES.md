# Invyra ScanOps — Stage AS.7 Route Host Home Escape Guard v1

## Status
AS.6 did not visibly resolve the Base44 preview issue. Stage AT Pilot Release Lock remains blocked until this route-host escape is preview-tested successfully.

## Problem observed
The preview still showed the scan/search bar and `No item selected.` without any visible app-owned Home escape. That means the previous route/page header approach was not reliably visible in the actual rendered handheld surface.

## Fix direction
This pass moves the invariant Home escape to the app route host for every non-Home route. It is still not a new workflow, tile, dashboard, filter, backend feature, setup wizard, role change, or printer route.

## What changed
- Added `src/components/scanner/AppEscapeHeader.jsx`.
- Updated `src/App.jsx` to render the escape header for every non-Home route.
- Added route title/subtitle metadata for every current ScanOps route.
- Updated `PageHeader.jsx` and `WorkflowHeader.jsx` with data attributes so existing route-level headers/chrome can be suppressed when the route-host escape is active.
- Updated `src/index.css` to hide duplicate route/page Home controls under the route host and keep exactly one visible Home button.

## Expected `/scan` result
The visible screen must now start with:

```text
[Home icon] Product Lookup
Scan or search item details

Search / scan item, PLU, SKU, barcode...
No item selected.
```

## Acceptance tests
1. Open `/` and confirm the Home launcher does not show a Home escape header.
2. Open `/scan` directly and confirm exactly one visible Home button appears above the search bar.
3. Tap Home from `/scan` and confirm it navigates directly to `/`.
4. Refresh `/scan` and confirm Home still appears.
5. Open every Home launcher app and confirm exactly one visible Home button.
6. Confirm no duplicate Back/Home controls appear in `/gap-scan`, `/stock-count`, `/receiving`, `/transfers`, or other workflows.
7. Confirm selected-item and empty-state screens still have a visible Home escape.
8. Run `npm run lint`.
9. Run `npm run build`.

## Out of scope
- No new workflow tiles.
- No filters.
- No dashboards.
- No setup wizard.
- No backend/API work.
- No printer routing.
- No role/sync redesign.
- No Home launcher redesign.
