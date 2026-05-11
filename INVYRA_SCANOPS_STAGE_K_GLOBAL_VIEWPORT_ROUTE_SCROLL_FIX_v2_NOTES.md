# Invyra ScanOps Stage K — Global Viewport + Route Scroll Fix v2

## Purpose
The previous viewport pass only improved specific Stock Count surfaces. Base44/device preview still preserved page scroll between routes and allowed some module pages to appear clipped when the user entered screens after scrolling the launcher or another workflow.

## Updated files
- `src/App.jsx`
- `src/index.css`

## Fixes applied
- Added a single `scanops-root-shell` around all routes.
- Locked the app root to a fixed `100dvh` viewport so outer browser/Base44 canvas scroll no longer controls the app.
- Forced every route page to behave as a fixed-height flex column.
- Forced page `main` regions to be the only vertical scroll containers.
- Prevented horizontal overflow globally inside the handheld shell.
- Added route-change scroll reset so switching from a scrolled launcher/module into Expiry Check, Stock Count, Scan, etc. starts at the top instead of inheriting the previous scroll position.
- Preserved all Stage K Stock Count / Stocktake governance logic.

## Validation
- `npm run lint`
- `npm run build`

## Test focus
1. Scroll the launcher down, then open Expiry Check — the top of the Expiry Check content should not be pre-scrolled or clipped.
2. Scroll any workflow, return home, then open another workflow — the new workflow should start at the top.
3. Confirm only the app's internal content scrolls; the outer browser/Base44 page should not be the app scroll mechanism.
4. Confirm no horizontal scrolling.
