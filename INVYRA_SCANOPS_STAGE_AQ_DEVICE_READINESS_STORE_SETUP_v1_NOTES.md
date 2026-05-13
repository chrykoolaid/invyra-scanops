# Invyra ScanOps Stage AQ — Device Readiness + Store Setup v1 Notes

## Stage purpose

Stage AQ freezes the pilot device/store readiness checklist so a store can prepare a handheld for pilot without adding product complexity.

## What changed

- Added `docs/STAGE_AQ_DEVICE_READINESS_STORE_SETUP.md`.
- Added `docs/STAGE_AQ_PILOT_STORE_SETUP_CHECKLIST.md`.
- Added `docs/STAGE_AQ_READINESS_ACCEPTANCE_NOTES.md`.
- Added `src/lib/deviceReadiness.js` with small constants only.

## What stayed unchanged

- Home launcher unchanged.
- Existing keyboard behavior unchanged.
- No new workflow tiles.
- No new screens.
- No filters.
- No setup wizard.
- No admin dashboard.
- No printer routing or discovery.
- No print queue.
- No network diagnostics panel.
- No backend API.
- No database migration.
- No role redesign.
- No sync redesign.
- No UAT script pack.

## Readiness contracts frozen

- Device identity fields.
- Device setup statuses.
- Operator-safe warning codes.
- Store/location setup fields.
- Allowed location types.
- Printer readiness states and wording.
- Offline readiness states and wording.
- Pilot support handoff boundary.
- Staff no-debug rule.

## Carry-forward

Stage AR can use these readiness docs as the basis for UAT scripts and test evidence. Stage AQ must remain a small readiness freeze, not a device-management platform.
