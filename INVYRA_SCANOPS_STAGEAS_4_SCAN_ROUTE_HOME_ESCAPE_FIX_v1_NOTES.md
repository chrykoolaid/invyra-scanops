# Invyra ScanOps Stage AS.4 — Scan Route Home Escape Fix v1

## Purpose

Stage AS.4 closes the remaining release-candidate navigation blocker where the `/scan` Product Lookup route could display only the scan/search field without an operator-visible Home return control.

This is a targeted release-candidate hotfix only. It does not add workflow scope or product complexity.

## What changed

- `src/pages/Scan.jsx` now renders the shared `PageHeader` for Product Lookup so the Home icon is present on the `/scan` route.
- `src/components/scanner/WorkflowHeader.jsx` now supports `showHeaderChrome={false}` so Product Lookup can reuse the scanner/search bar without duplicating the Home/title row.
- The `/scan` route now has one Home escape path, not zero and not two.

## No over-engineering confirmation

- No new workflow tiles.
- No new operational screens.
- No filters.
- No dashboards.
- No setup wizard.
- No backend/API work.
- No printer routing.
- No role redesign.
- No scan/search logic rewrite.

## Acceptance checks

- Open `/scan` directly: Product Lookup header and Home icon are visible.
- Tap Home from `/scan`: app returns to `/`.
- `/scan` shows only one Home control.
- Existing workflow routes retain their single existing Home control.
- Lint passes.
- Production build passes.

## Stage AT impact

Stage AT remains blocked until this AS.4 hotfix is preview-tested on `/scan` and the previously affected workflow routes. After AS.4 passes, Stage AT can be rerun as the final Pilot Release Lock.
