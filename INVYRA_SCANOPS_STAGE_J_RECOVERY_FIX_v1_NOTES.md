# Invyra ScanOps Stage J Recovery Fix v1

Baseline: `Invyra_ScanOps_StageI2_Transfers_Validation_Hardening_v1.zip`

## Goal

Clean Stage J recovery from the Stage I2 baseline. Do not continue patch-stacking from a broken Stage J build.

## Added

- Header `☰` operational menu.
- Operational menu panel with Daily Controls, Session, Settings, and Support sections.
- Local session/device/role helper.
- Role permission helper.
- Local operational audit helper.
- Scanner Test panel that records test traces without stock mutation.
- Device Status panel with prototype-only role preview for Staff/Supervisor/Manager/Admin acceptance testing.
- Supervisor Override request/review flow with Staff blocked-attempt audit logging.
- Shelf Ticket Queue Status readout from the existing sync queue.

## Updated

- `src/components/scanner/AppHeader.jsx`
- `src/lib/scanOpsEvents.js`
- `src/lib/scanOpsSync.js`
- `README.md`

## Boundaries

- Home remains a 3-column launcher.
- No Stage J Home tile.
- No extra Home row.
- No backend server.
- No printer infrastructure.
- No full login/user management.
