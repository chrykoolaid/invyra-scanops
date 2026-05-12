# Invyra ScanOps Stage AJ — Pilot Readiness / UAT Hardening Pack v1

Baseline:
`Invyra_ScanOps_StageAI_StoreOpsDashboard_ExceptionCommandCenter_v1.zip`

Output:
`Invyra_ScanOps_StageAJ_PilotReadiness_UATHardeningPack_v1.zip`

## Purpose

Stage AJ closes ScanOps Phase 2 with a local Pilot Readiness Center. It is a readiness, UAT, issue-log, and release-gate proof layer. It does not add a new inventory workflow.

## Added

- New `Pilot Readiness` route at `/pilot-readiness`.
- New Operational Menu entry after `Store Ops Dashboard`.
- Readiness Summary with Local UAT Evidence, Desktop Not Connected, Contract Preview, current role/device/shift, completed checks, blockers, warnings, and Not Tested counts.
- UAT packs:
  - Core Smoke Test
  - Role Matrix Test
  - Workflow Test
  - Offline / Sync Safety Test
  - Exception Command Center Test
  - Release Gate Test
- Per-check result states:
  - Not tested
  - Pass
  - Fail
  - Blocked
- Per-check tester evidence notes with actor, role, device, shift, and timestamp.
- Pilot Issue Log with local issue creation, severity, status, expected behavior, observed behavior, and notes.
- Role-gated issue closing and release-gate controls.
- Local Release Gate panel for Manager/Admin pilot readiness review.
- Copyable plain text Pilot Report.
- Local audit events for AJ view, UAT check updates, issue creation/updates/notes, report copy, and release-gate updates.

## Safety / scope locks preserved

- Home launcher untouched.
- Keyboard untouched.
- Product Lookup untouched.
- Receiving untouched.
- Transfers untouched.
- Stock Count untouched.
- Stage AA through Stage AI screens untouched except for routing/menu addition.
- No real API transport.
- No real desktop sync.
- No real printer routing.
- No approval execution.
- No inventory mutation.
- No price mutation.
- No promotion mutation.
- No waste/accounting mutation.
- AJ wording stays honest: Local UAT Evidence, Pilot Readiness, Contract Preview, Desktop Not Connected.

## Files changed / added

- Added `src/lib/scanOpsPilotReadiness.js`
- Added `src/pages/PilotReadiness.jsx`
- Updated `src/App.jsx`
- Updated `src/components/scanner/OperationalMenuPanel.jsx`
- Updated `src/lib/scanOpsEvents.js`
- Added this notes file

## Validation

- `npm run lint` passed after installing project dependencies locally.
- `npm run build` completed and generated `dist/` successfully.

## Manual smoke test checklist

1. Open app Home and confirm launcher layout is unchanged.
2. Open Operational Menu.
3. Confirm `Pilot Readiness` appears after `Store Ops Dashboard`.
4. Open `Pilot Readiness`.
5. Confirm Readiness Summary shows Local UAT Evidence and Desktop Not Connected.
6. Open UAT tab and mark a check Pass / Fail / Blocked / Not Tested.
7. Save tester evidence and confirm actor/role/device/shift proof appears.
8. Open Issues tab and create a local issue.
9. Add an issue note and change status.
10. Confirm Staff cannot close blockers or mark Local Pilot Ready.
11. Switch role preview to Supervisor and confirm UAT/issue review is available but final Pilot Ready remains blocked.
12. Switch role preview to Manager/Admin and confirm Release Gate controls are visible.
13. Confirm Local Pilot Ready remains disabled until all checks pass and open blocker/high issues are cleared.
14. Open Report tab and copy the Pilot Report.
15. Confirm no route shows horizontal scrolling, toast spam, fake sync, fake printing, or live deployment certification wording.
