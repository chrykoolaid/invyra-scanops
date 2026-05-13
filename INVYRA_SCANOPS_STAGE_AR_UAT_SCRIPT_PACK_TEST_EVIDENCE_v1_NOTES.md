# Invyra ScanOps Stage AR — UAT Script Pack + Test Evidence v1 Notes

## Stage purpose

Stage AR freezes a practical UAT script pack and lightweight evidence template for pilot testing. It prepares store testers to prove readiness without turning ScanOps into a QA management product.

## Baseline

```text
Invyra_ScanOps_StageAQ_DeviceReadinessStoreSetup_v1.zip
```

## Output

```text
Invyra_ScanOps_StageAR_UATScriptPack_TestEvidence_v1.zip
```

## What changed

- Added `docs/STAGE_AR_UAT_SCRIPT_PACK.md`.
- Added `docs/STAGE_AR_TEST_EVIDENCE_TEMPLATE.md`.
- Added `docs/STAGE_AR_PILOT_TEST_RUN_CHECKLIST.md`.
- Added `docs/STAGE_AR_ACCEPTANCE_NOTES.md`.
- Added this Stage AR implementation notes file.

## What stayed unchanged

- Home launcher unchanged.
- Keyboard unchanged.
- No workflow tiles added.
- No app screens added.
- No filters added.
- No setup wizard added.
- No QA dashboard added.
- No automated test runner added.
- No backend API added.
- No database migration added.
- No device registry added.
- No printer routing or discovery added.
- No sync redesign added.
- No role redesign added.
- No login redesign added.
- Existing workflows remain untouched.
- Existing role guards remain untouched.
- Existing offline/sync behavior remains untouched.
- Existing Stage AO error/recovery wording remains untouched.
- Existing Stage AP data contracts remain untouched.
- Existing Stage AQ device readiness docs remain untouched.

## UAT coverage groups frozen

- Group 1 — Device + Store Readiness.
- Group 2 — Core Scan + Manual Search.
- Group 3 — Core Workflows.
- Group 4 — Offline + Sync Honesty.
- Group 5 — Role + Permission Hardening.
- Group 6 — Error + Recovery Paths.
- Group 7 — Pilot Exit Readiness.

## Script coverage

- Home launcher sanity check.
- Scanner input test.
- Manual search fallback test.
- Product Lookup test.
- Receiving test.
- Waste test.
- Markdown test.
- Shelf Ticket test.
- Stock Count / Quick Count test.
- Transfers test.
- Replenishment / Backroom-to-Shelf test.
- Price Check / Promotion Label Verification test.
- Offline saved-local behavior test.
- Sync retry wording test.
- Error/recovery wording test.
- Role permission check.
- Device readiness check.

## Acceptance boundary

Stage AR is accepted only if it remains documentation-only and evidence-focused. The pilot team should know exactly what to test, what evidence to capture, and what counts as acceptable without receiving any new app complexity.

## Recommended verification

```bash
npm run lint
npm run build
```

Because Stage AR changes documentation only, lint/build should remain equivalent to the Stage AQ baseline.

## Git commit command

PowerShell-safe command:

```powershell
git add docs/STAGE_AR_UAT_SCRIPT_PACK.md docs/STAGE_AR_TEST_EVIDENCE_TEMPLATE.md docs/STAGE_AR_PILOT_TEST_RUN_CHECKLIST.md docs/STAGE_AR_ACCEPTANCE_NOTES.md INVYRA_SCANOPS_STAGE_AR_UAT_SCRIPT_PACK_TEST_EVIDENCE_v1_NOTES.md; git commit -m "Add ScanOps Stage AR UAT script pack and test evidence docs"
```
