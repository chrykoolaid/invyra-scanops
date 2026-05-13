# Invyra ScanOps Stage AT — Pilot Release Lock v1 Notes

Stage AT is the final Phase 4 pilot release lock for Invyra ScanOps.

This build does not add functionality.
This build does not redesign workflows.
This build does not add filters, dashboards, setup wizards, QA tools, backend APIs, printer routing, analytics, reporting, or new operational screens.

It locks the Stage AS release candidate for pilot use, subject to final go/no-go checks.

## Baseline

```text
Invyra_ScanOps_StageAS_ReleaseCandidateStabilisation_v1.zip
```

## Output

```text
Invyra_ScanOps_StageAT_PilotReleaseLock_v1.zip
```

## Files added

```text
docs/STAGE_AT_PILOT_RELEASE_LOCK.md
docs/STAGE_AT_RELEASE_MANIFEST.md
docs/STAGE_AT_PILOT_GO_NO_GO_CHECKLIST.md
docs/STAGE_AT_PILOT_HANDOVER_NOTES.md
docs/STAGE_AT_ROLLBACK_AND_STOP_PILOT_RULES.md
INVYRA_SCANOPS_STAGE_AT_PILOT_RELEASE_LOCK_v1_NOTES.md
```

## Files intentionally not changed

No source-code files were changed for Stage AT.

No launcher, route, workflow, role, sync, printer, dashboard, filter, setup, backend, database, or UI logic files were changed.

## Release-lock boundary

Stage AT is a sign-off and lock stage only.

If a P0 blocker is found, Stage AT must be marked blocked and the project must return to a controlled RC hotfix path. P0 blockers must not be hidden inside a pilot lock package.

## End of Phase 4 confirmation

Stage AT closes Phase 4 — Production Simplification + Pilot Hardening.

The next step after Stage AT is pilot execution, not another Phase 4 feature stage.
