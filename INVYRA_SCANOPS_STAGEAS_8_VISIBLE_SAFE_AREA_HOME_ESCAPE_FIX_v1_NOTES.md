# Invyra ScanOps Stage AS.8 — Visible Safe-Area Home Escape Fix v1

## Scope

Stage AS.8 is a route visibility/render-path blocker fix for the Home escape control. It does not add a new navigation concept, new workflow tiles, filters, dashboards, setup wizards, backend/API work, printer routing, role redesign, sync logic, or browser-history back behavior.

## Baseline

Input package:

- `Invyra_ScanOps_StageAS_7_RouteHostHomeEscapeGuard_v1.zip`
- Expected prior commit: `0bb74603 Add ScanOps route host home escape guard`

## Blocker addressed

Base44 preview still showed `/scan` as:

```text
Search / scan item...
No item selected.
```

The Product Lookup route had no visible Home escape above the search bar. This meant Stage AT Pilot Release Lock remained blocked because Home-launched workflows could still trap the operator inside a workflow.

## Inspection findings before patching

### 1. `/scan` was not bypassing `App.jsx`

`src/App.jsx` already mounted `AppEscapeHeader` whenever `getAppEscapeMeta(location.pathname)` returned route metadata. The `/scan` route returned:

```js
"/scan": { title: "Product Lookup", subtitle: "Scan or search item details" }
```

That means `/scan` should receive app-level Home escape metadata.

### 2. `/scan` route content was rendering through the route wrapper

`src/pages/Scan.jsx` rendered:

- `PageShell`
- `PageHeader title="Product Lookup" subtitle="Scan or search item details"`
- `WorkflowHeader` with `showHeaderChrome={false}`
- `WorkflowMain` with `No item selected.`

The preview evidence showed the workflow search bar but not the `PageHeader`. That means the route wrapper and duplicate-suppression state were likely active, because the nested page header was already being hidden.

### 3. AS.7 mounted the app-owned escape outside the route host/content path

Before this patch, the render order was:

```jsx
<div className="scanops-root-shell" data-scanops-app-escape-active="true">
  <ScrollToTopOnRouteChange />
  <AppEscapeHeader />
  <div className="scanops-route-host">
    <Routes />
  </div>
</div>
```

The app escape was therefore outside the actual route host/content flow. In Base44/mobile preview conditions, that made it more vulnerable to top-frame clipping, parent viewport positioning, or browser/preview chrome overlap.

### 4. Duplicate-suppression CSS was too broad for future route-host placement

AS.7 contained this selector:

```css
[data-scanops-app-escape-active="true"] .scanops-route-host button[aria-label="Return to Home"] {
  display: none !important;
}
```

That selector was safe only while `AppEscapeHeader` stayed outside `.scanops-route-host`. Moving the app escape inside the route host required tightening this rule so only nested page/workflow Home controls are suppressed.

## Implementation summary

### Updated `src/App.jsx`

Changed the render path so the app-owned Home escape is inside `.scanops-route-host`, directly above route content:

```jsx
<div className="scanops-route-host">
  {appEscapeMeta && <AppEscapeHeader {...appEscapeMeta} />}
  <div className="scanops-route-content">
    <Routes>...</Routes>
  </div>
</div>
```

This makes the Home escape a normal in-flow visible block at the top of every non-Home route.

### Updated `src/index.css`

Added `.scanops-route-content` as the scroll/content wrapper below the app escape.

Added Stage AS.8 CSS hardening:

- `.app-escape-header, .scanops-app-escape-header` uses explicit visible flex display.
- Header is relative, in-flow, width 100%, high z-index, and visible overflow.
- Header uses safe-area top padding while staying inside the app body.
- Duplicate suppression now targets only:
  - `[data-scanops-page-header]`
  - `[data-scanops-workflow-chrome]`
  - Home buttons inside those nested headers only
- The app-owned `.app-escape-header` / `.scanops-app-escape-header` is not targeted by duplicate suppression.

### Updated `src/components/scanner/AppEscapeHeader.jsx`

Added the explicit unique class requested by the scope:

```jsx
<header className="app-escape-header scanops-app-escape-header" data-scanops-app-escape-header>
```

The button still navigates directly to `/` and does not rely on browser history.

## Expected `/scan` visual result

```text
┌──────────────────────────────┐
│ 🏠  Product Lookup            │
│     Scan or search item       │
├──────────────────────────────┤
│ Search / scan item, PLU...    │
├──────────────────────────────┤
│ No item selected.             │
└──────────────────────────────┘
```

## Routes covered by route-host escape

The route-host escape now applies to every non-Home route that returns app escape metadata, including:

- `/scan`
- `/gap-scan`
- `/stock-count`
- `/receiving`
- `/transfers`
- `/replenish`
- `/tasks`
- `/markdowns`
- `/waste`
- `/expiry-check`
- `/shelf-tickets`
- `/inventory-sync`
- `/sync-queue`
- `/price-check`
- `/product/:id`
- `/product-identity-review`
- `/scanops-reporting`
- `/device-governance`
- `/session-collaboration`
- `/desktop-sync-contract`
- `/store-ops-dashboard`
- `/pilot-readiness`

`/` remains excluded so the Home launcher does not show a duplicate Home button.

## Files changed

- `src/App.jsx`
- `src/index.css`
- `src/components/scanner/AppEscapeHeader.jsx`
- `INVYRA_SCANOPS_STAGEAS_8_VISIBLE_SAFE_AREA_HOME_ESCAPE_FIX_v1_NOTES.md`

## Files intentionally not changed

- `src/pages/Scan.jsx`
- `src/components/scanner/PageHeader.jsx`
- `src/components/scanner/WorkflowHeader.jsx`

These were inspected, but no route-specific `/scan` fallback was added because the app-level route-host escape can be made reliable.

## Acceptance checklist

- [ ] Open `/`.
- [ ] Confirm Home launcher itself does not show a duplicate Home button.
- [ ] Open `/scan` directly.
- [ ] Confirm a visible Home icon/button appears above the search bar.
- [ ] Confirm `/scan` title says `Product Lookup`.
- [ ] Confirm `/scan` helper says `Scan or search item details` or equivalent.
- [ ] Tap Home from `/scan`.
- [ ] Confirm it navigates directly to `/`.
- [ ] Refresh `/scan`.
- [ ] Confirm Home still appears.
- [ ] Confirm `/scan` has exactly one Home control.
- [ ] Open every Home-launched workflow route.
- [ ] Confirm each route shows exactly one visible Home control.
- [ ] Confirm no route has duplicate Back + Home controls.
- [ ] Confirm empty states still show Home.
- [ ] Confirm selected-item states still show Home.
- [ ] Confirm no horizontal scrolling.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Preview-test successfully in Base44 before unblocking Stage AT.

## Git commands

```bash
git status
git add src/App.jsx
git add src/index.css
git add src/components/scanner/AppEscapeHeader.jsx
git add INVYRA_SCANOPS_STAGEAS_8_VISIBLE_SAFE_AREA_HOME_ESCAPE_FIX_v1_NOTES.md
git commit -m "Fix ScanOps visible safe area home escape"
git pull --rebase
git push
```

## Stage AT release note

Stage AT remains blocked until the AS.8 package is preview-tested in Base44 and `/scan` visibly shows exactly one app-owned Home escape above the search/search-item area.
