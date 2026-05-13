# Invyra ScanOps Stage AS — Release Candidate Stabilisation v1 Notes

## Build

```text
Invyra_ScanOps_StageAS_ReleaseCandidateStabilisation_v1.zip
```

## Baseline

```text
Invyra_ScanOps_StageAR_UATScriptPack_TestEvidence_v1.zip
```

## Scope

Stage AS is a release-candidate stabilisation gate. It prepares the Stage AR UAT-ready build for Stage AT Pilot Release Lock without increasing product complexity.

This pass is intentionally documentation-only unless a clear pilot-blocking defect is found.

## Files added

- `docs/STAGE_AS_RELEASE_CANDIDATE_STABILISATION.md`
- `docs/STAGE_AS_RC_REGRESSION_CHECKLIST.md`
- `docs/STAGE_AS_DEFECT_TRIAGE_RULES.md`
- `docs/STAGE_AS_KNOWN_LIMITATIONS_AND_PILOT_WAIVERS.md`
- `docs/STAGE_AS_RC_SIGNOFF_CHECKLIST.md`
- `INVYRA_SCANOPS_STAGE_AS_RELEASE_CANDIDATE_STABILISATION_v1_NOTES.md`

## Source changes

No source-code changes were intentionally made in Stage AS.

## What Stage AS confirms

- RC stabilisation notes exist.
- RC regression checklist exists.
- Defect triage rules exist.
- Known limitations and pilot waivers are documented.
- RC sign-off checklist exists.
- Stage AP docs remain present.
- Stage AQ docs remain present.
- Stage AR docs remain present.
- Stage AS remains a freeze/stabilisation gate, not a feature stage.

## Non-goals preserved

- No new workflow tiles.
- No new app screens.
- No filters.
- No dashboards.
- No setup wizards.
- No QA platform.
- No automated test runner.
- No screenshot upload system.
- No backend API.
- No database migration.
- No printer routing.
- No printer discovery.
- No sync redesign.
- No role redesign.
- No login redesign.
- No analytics/reporting expansion.
- No new operational workflows.
- No visual redesign.
- No large refactor.

## Carry-forward locks

- Preserve Stage AK simplification.
- Preserve Stage AL reduced-tap behavior.
- Preserve Stage AM role hardening.
- Preserve Stage AN offline/sync honesty.
- Preserve Stage AO error/recovery wording.
- Preserve Stage AP pilot data contracts.
- Preserve Stage AQ device/store readiness scope.
- Preserve Stage AR UAT script pack and evidence template.
- Do not add major workflow tiles after Stage AJ.
- Do not introduce filter-heavy UI.
- Do not turn stabilisation into a feature sprint.

## Stage AT readiness

Stage AS can proceed to Stage AT only after RC sign-off confirms:

- Lint/build status is recorded.
- No P0 blocker remains.
- Known limitations are documented.
- Pilot tester can follow Stage AR UAT pack.
- No overengineering was introduced.
