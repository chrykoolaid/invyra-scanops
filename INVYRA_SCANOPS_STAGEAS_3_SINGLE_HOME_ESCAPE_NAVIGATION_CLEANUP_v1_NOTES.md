# Invyra ScanOps Stage AS.3 — Single Home Escape Navigation Cleanup v1

## Baseline

`Invyra_ScanOps_StageAS_2_GlobalHomeEscapeNavigationFix_v1.zip`

## Purpose

Stage AS.2 proved the need for an app-owned Home escape path, but it introduced duplicate return/navigation controls on workflow screens. Stage AS.3 corrects that release-candidate blocker by enforcing one visible navigation escape per non-home screen.

## Decision

Use the existing workflow/page header as the single navigation surface. Replace the old history-based back chevron with a Home icon that always routes directly to `/`. Remove the separate global escape header so the operator does not see duplicate return controls or duplicate workflow titles.

## What changed

- Removed `AppEscapeHeader` rendering from `src/App.jsx`.
- Removed `src/components/scanner/AppEscapeHeader.jsx`.
- Updated `WorkflowHeader` so its left icon returns directly to Home instead of calling browser history back.
- Updated `PageHeader` so its left icon returns directly to Home instead of calling browser history back.
- Kept the route host viewport containment so workflow content still scrolls inside the app frame.
- Removed unused AS.2 global escape-header CSS.

## Operator result

Every workflow/page header now presents one simple escape action:

```text
[Home icon]  Current screen title  [sync/status]
```

There is no separate Back button and no duplicate Home bar.

## Out of scope confirmation

- No workflow tiles added.
- No new screens added.
- No filters added.
- No dashboards added.
- No setup wizard added.
- No backend/API work added.
- No printer routing added.
- No role redesign added.
- No workflow logic rewritten.

## Acceptance checks

1. `/gap-scan` shows one Home escape icon only.
2. `/stock-count` shows one Home escape icon only.
3. `/receiving` shows one Home escape icon only.
4. `/price-check` shows one Home escape icon only.
5. `/waste` shows one Home escape icon only.
6. `/markdowns` shows one Home escape icon only.
7. `/shelf-tickets` shows one Home escape icon only.
8. `/sync-queue` shows one Home escape icon only.
9. Tapping the Home icon always navigates to `/`.
10. The Home route itself does not show duplicate navigation.

Stage AT remains blocked until this AS.3 cleanup is preview-tested across the affected routes.
