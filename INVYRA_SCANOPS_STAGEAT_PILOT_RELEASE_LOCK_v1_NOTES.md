# Invyra ScanOps Stage AT — Pilot Release Lock v1 Notes

## Baseline used

- `Invyra_ScanOps_StageAS_8_1_LegacyBackControlCleanup_v1.zip`

## Output package

- `Invyra_ScanOps_StageAT_PilotReleaseLock_v1.zip`

## Final route list checked

- `/`
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

## Navigation lock confirmation

- AS.8.1 navigation doctrine remains locked.
- Workflow routes keep the app-owned top Home escape.
- No route-host rewrite was performed.
- No AppEscapeHeader behavior change was performed.
- No duplicate route-level Back + Home escape controls were added.
- Home launcher architecture remains unchanged.

## No-new-workflow confirmation

- No new workflow tiles were added.
- No new filters were added.
- No dashboard, setup wizard, backend/API, printer routing, offline engine, role/sync, or data model work was added.
- Stage AT only cleaned pilot-facing implementation wording in the route escape metadata and added this release note.

## Pilot-facing copy cleanup

The following implementation-facing subtitles were replaced with simple operator-facing language:

- Stock Count: `Count stock and review variances`
- Receiving: `Receive stock and confirm delivery evidence`
- Replenish: `Move stock from backroom to shelf`
- Gap Scan: `Record shelf gaps and follow-up actions`
- Waste: `Capture waste and review shrink evidence`

## Known non-blocking notes

- Stage AT is a release-lock pass only. It does not attempt to redesign route internals.
- Some non-Phase-4 legacy/admin routes still exist in the codebase, but they were not added or expanded in this pass.
- Manual viewport proof should still be captured during pilot UAT on the target handheld/browser.
- `npm ci` reported existing dependency audit warnings: 16 vulnerabilities (8 moderate, 8 high). No dependency upgrades were performed in Stage AT because this pass is release-lock only.

## Lint/build result placeholders

- `npm run lint`: passed
- `npm run build`: passed (`VITE_BASE44_APP_BASE_URL` not set warning only; build output generated)

## Pilot acceptance checklist

- [ ] Home launcher opens normally.
- [ ] All final workflow routes remain reachable from Home.
- [ ] Every workflow route has a visible top Home escape.
- [ ] Workflow routes return safely to `/`.
- [ ] Refreshing each workflow route preserves the Home escape.
- [ ] No duplicate route-level Back + Home escape controls appear.
- [ ] No horizontal scrolling appears in pilot workflows.
- [ ] Primary actions remain visible or reachable by normal vertical scroll.
- [ ] No implementation wording such as `with a direct Home escape` remains in visible pilot route subtitles.
- [ ] No new workflow tiles, filter panels, dashboard, setup wizard, or backend rebuild was introduced.
