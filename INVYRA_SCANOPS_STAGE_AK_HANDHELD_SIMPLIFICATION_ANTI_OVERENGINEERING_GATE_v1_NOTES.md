# Invyra ScanOps Stage AK — Handheld Simplification / Anti-Overengineering Gate v1

Baseline: `Invyra_ScanOps_StageAJ_PilotReadiness_UATHardeningPack_v1.zip`

Output: `Invyra_ScanOps_StageAK_HandheldSimplification_AntiOverengineeringGate_v1.zip`

## Purpose

Stage AK is a product-diet pass for the handheld app. It prevents desktop/admin concepts from leaking into normal staff scanner workflows and keeps the handheld focused on scan, act, confirm.

## Implemented changes

### Operational Menu simplification

- Rebuilt the Operational Menu into clear handheld groups:
  - Daily Work
  - My Work
  - Manager Review
  - UAT / Diagnostics
  - Device & Help
- Staff sees Daily Work, My Work, Sync Status, Report Issue, Device Status, Settings, Help, About, and End Session.
- UAT / Diagnostics is hidden from Staff.
- Store Exceptions, Sync Review, Product Review, Device / Shift Status, Pilot Readiness, Contract Preview, Scanner Test, and Audit are role-gated behind Supervisor/Manager/Admin rules depending on sensitivity.
- Staff no longer sees Pilot Readiness, Desktop Sync Contract, payload inspection, release gate, scanner diagnostics, or audit diagnostics as normal operational menu items.

### Pilot Readiness simplification

- Staff direct access to Pilot Readiness now resolves to a simple Report Pilot Issue surface only.
- Staff no longer sees UAT packs, role matrix testing, release gate, full reports, Copy Report, contract preview, or payload diagnostics.
- Issue reporting now uses simple handheld choices: Blocked, Warning, Observation.
- Pilot Issue Log uses simple status sections: Needs Action, Blocked, Reviewed.
- Manager/Admin retain the full Pilot Readiness workspace and release-gate tools.

### Store Exceptions simplification

- Store Ops Dashboard is now presented as Store Exceptions.
- Removed dashboard/command-center mode switching from the handheld surface.
- Added simple status sections: Needs Action, Blocked, Waiting Sync, Reviewed.
- Kept logic local and safe: inspect, note, defer, and mark reviewed only.
- Payload and desktop response inspection are hidden unless the user has Manager/Admin visibility.
- Stage AI wording was normalized so the handheld no longer feels like a desktop reporting dashboard.

### Sync wording simplification

- Sync Queue is now titled Sync Status for Staff and Sync Review for elevated roles.
- Removed compact filter controls for workflow, state, device, user, and age from the handheld surface.
- Replaced tab set with simple sections: Waiting, Needs Review, Done, plus Discarded for non-Staff roles.
- Staff-facing language now emphasizes Saved locally, Waiting to sync, Needs review, and no live mutation.
- Desktop Sync Contract direct access now shows Staff a simplified Sync Status view only; contract preview, validation events, payload inspection, and desktop response preview are Manager/Admin diagnostics.

### Task queue simplification

- Removed handheld task filter controls for Assigned to, Priority, Due, Source, and Status.
- Tasks now uses simple task sections: My Tasks, Team Tasks, Escalated, Done.
- The local reset/testing helper is hidden from Staff and available only to Manager/Admin.

## Preserved behavior

- Home launcher untouched.
- Keyboard behavior untouched.
- Product Lookup untouched.
- Receiving untouched.
- Transfers untouched.
- Stock Count untouched.
- Replenishment, Price Check, Shelf Tickets, Markdown, Waste, Device Governance, Collaboration, Desktop Sync Contract logic, Store Ops logic, and Pilot Readiness logic are preserved except for visibility, wording, grouping, and simplification.
- No real desktop sync was added.
- No real API transport was added.
- No real printer routing was added.
- No approval execution was added.
- No inventory, price, promo, waste, or accounting mutation was added.

## Verification

- `npm run lint` passed.
- `npm run build` passed.

## Changed files

- `src/components/scanner/OperationalMenuPanel.jsx`
- `src/pages/PilotReadiness.jsx`
- `src/pages/StoreOpsDashboard.jsx`
- `src/pages/SyncQueue.jsx`
- `src/pages/DesktopSyncContract.jsx`
- `src/pages/Tasks.jsx`
- `src/lib/scanOpsStoreOpsDashboard.js`
- `INVYRA_SCANOPS_STAGE_AK_HANDHELD_SIMPLIFICATION_ANTI_OVERENGINEERING_GATE_v1_NOTES.md`
