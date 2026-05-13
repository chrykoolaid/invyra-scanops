# Invyra ScanOps Stage AS.2 — Global Home Escape Navigation Fix v1

## Baseline

`Invyra_ScanOps_StageAS_ReleaseCandidateStabilisation_v1.zip`

This hotfix is intentionally built from the Stage AS release-candidate baseline, not from the earlier AS.1 navigation attempt.

## Purpose

Stage AS.2 fixes a pilot-blocking navigation issue: workflow screens could be opened directly, refreshed, or scrolled without a reliable app-owned way to return to the Home launcher.

The app must not rely on browser history, preview URL controls, or workflow-specific headers as the operator's only escape path.

## Fix summary

Added one shared global escape header mounted above route content:

`src/components/scanner/AppEscapeHeader.jsx`

The header is hidden on `/` and shown on non-home routes. It displays:

`Home    Current workflow name`

The Home button navigates directly to `/` and does not depend on browser route history.

## Files changed

- `src/App.jsx`
- `src/components/scanner/AppEscapeHeader.jsx`
- `src/index.css`
- `INVYRA_SCANOPS_STAGEAS_2_GLOBAL_HOME_ESCAPE_NAVIGATION_FIX_v1_NOTES.md`

## Scope guard

This hotfix does not add:

- New workflow tiles
- New operational screens
- Filters
- Dashboards
- Setup wizards
- QA platforms
- Backend APIs
- Database migrations
- Printer routing
- Sync redesign
- Role redesign
- Login redesign
- Analytics
- Reporting modules

## Route coverage

The global escape header covers the current ScanOps routes, including:

- Gap Scan
- Stock Count
- Receiving
- Replenishment
- Price Check
- Markdowns
- Waste
- Expiry Check
- Tasks
- Inventory Sync
- Sync Queue
- Shelf Tickets
- Transfers
- Product Lookup
- Product Review
- Reporting
- Device Governance
- Session Collaboration
- Desktop Sync Contract
- Store Ops Dashboard
- Pilot Readiness

Unknown non-home routes fall back to `Current Screen` while still providing a Home button.

## Acceptance result

Expected acceptance after validation:

- Direct open of workflow route shows Home escape header.
- Refresh on workflow route keeps Home escape header.
- Scroll inside workflow route keeps Home escape header visible because it is outside the scrollable route body.
- Home button returns directly to `/`.
- Home page does not show duplicate Home navigation.
- No feature scope was added.

## Stage AT impact

Stage AT Pilot Release Lock remains blocked until this RC hotfix is validated. After validation, rerun Stage AT against the corrected release candidate.
