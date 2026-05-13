# Invyra ScanOps — Stage AS.8.1 Legacy Back Control Cleanup v1

## Baseline

- `Invyra_ScanOps_StageAS_8_VisibleSafeAreaHomeEscapeFix_v1`

## Scope

Stage AS.8.1 is a narrow cleanup pass only. AS.8's app-owned Home escape remains the locked navigation baseline.

## Change Summary

- Removed the legacy `/stock-count` landing footer `Back` button that called `navigate(-1)`.
- Preserved the top app-owned Home escape as the single route escape for `/stock-count`.
- Converted the `/stock-count` landing footer to a single full-width primary action: `Start New Count Session`.
- Removed the now-unused `useNavigate` dependency from `StockCount.jsx`.
- Left internal workflow controls intact where they return to a local workflow state, batch list, task list, or cancel a local operation.

## Intentional Non-Changes

- No App.jsx route-host rewrite.
- No AppEscapeHeader redesign.
- No Home launcher redesign.
- No workflow page rebuild.
- No new workflow tiles.
- No filters, dashboards, setup wizard, backend/API, printer routing, role logic, sync logic, or browser-history behavior changes.

## Route Inspection Notes

Checked the Home-launched workflow surfaces for legacy route-level Back controls:

- `/scan` — no route-level Back control found.
- `/gap-scan` — no route-level Back control found.
- `/stock-count` — legacy landing `Back` route escape removed.
- `/receiving` — `Back to Batches` is an internal batch-workspace return, not a route escape; preserved.
- `/transfers` — `Back to Transfers` is an internal transfer-workspace return, not a route escape; preserved.
- `/replenish` — no route-level Back control found.
- `/tasks` — `Back to Tasks` is an internal task-detail return, not a route escape; preserved.
- `/markdowns` — no route-level Back route escape found.
- `/waste` — no route-level Back route escape found.
- `/expiry-check` — no route-level Back route escape found.
- `/shelf-tickets` — no route-level Back route escape found.
- `/inventory-sync` — no route-level Back route escape found.

## Acceptance Evidence

- `npm run lint` passes.
- `npm run build` passes.
- Build output created successfully under `dist/` during verification only; `dist/` is not included in this source package.

## Manual QA Checklist

1. Open `/`.
2. Confirm Home launcher has no Home escape button.
3. Open `/stock-count`.
4. Confirm top Home escape is visible.
5. Confirm bottom Back button is gone.
6. Confirm `Start New Count Session` remains visible and usable.
7. Tap top Home from `/stock-count`.
8. Confirm it navigates directly to `/`.
9. Refresh `/stock-count`.
10. Confirm Home still appears and Back does not return.
11. Open `/scan`.
12. Confirm exactly one Home control and no Back.
13. Open `/gap-scan`.
14. Confirm exactly one Home control and no route-level Back.
15. Open `/receiving`.
16. Confirm exactly one Home control and no route-level Back.
17. Open `/transfers`.
18. Confirm exactly one Home control and no route-level Back.
19. Open `/replenish`.
20. Confirm exactly one Home control and no route-level Back.
21. Open `/tasks`.
22. Confirm exactly one Home control and no route-level Back.
23. Open `/markdowns`.
24. Confirm exactly one Home control and no route-level Back.
25. Open `/waste`.
26. Confirm exactly one Home control and no route-level Back.
27. Open `/expiry-check`.
28. Confirm exactly one Home control and no route-level Back.
29. Open `/shelf-tickets`.
30. Confirm exactly one Home control and no route-level Back.
31. Open `/inventory-sync`.
32. Confirm exactly one Home control and no route-level Back.
33. Confirm no route has duplicate Back + Home controls.
34. Confirm no horizontal scrolling.

## Git Commands

```bash
git status
git add src/pages/StockCount.jsx
git add INVYRA_SCANOPS_STAGEAS_8_1_LEGACY_BACK_CONTROL_CLEANUP_v1_NOTES.md
git commit -m "Remove ScanOps legacy route back controls"
git pull --rebase
git push
```
