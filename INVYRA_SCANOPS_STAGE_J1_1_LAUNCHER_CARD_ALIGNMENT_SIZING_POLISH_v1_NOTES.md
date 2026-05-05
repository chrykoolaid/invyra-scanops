# Invyra ScanOps Stage J.1.1 — Launcher Card Alignment + Sizing Polish v1

Baseline:
- Invyra_ScanOps_StageJ_Recovery_Fix_v1.zip

Scope:
- UI polish only.
- No feature, routing, menu, audit, sync, transfer, shelf ticket, or inventory logic changes.

Updated files:
- src/components/scanner/ActionTile.jsx
- src/pages/Home.jsx

What changed:
- Locked every Home launcher tile to the same visual height.
- Replaced aspect-square content balancing with a fixed scanner-friendly tile contract.
- Standardized icon tile size and top placement across all modules.
- Added a reserved label area so one-line and two-line labels align consistently.
- Kept the existing 3-column launcher structure.
- Kept all existing launcher routes and module order.
- Kept Stage J header/menu behavior unchanged.

Acceptance checks:
- Home remains a 3-column launcher.
- No Stage J tile was added.
- No extra Home row was added.
- Launcher buttons/cards now use the same height and internal spacing.
- Icon blocks align consistently across all launcher buttons.
- One-line and two-line labels are visually balanced inside the same reserved text area.
- No horizontal scrolling was introduced.
