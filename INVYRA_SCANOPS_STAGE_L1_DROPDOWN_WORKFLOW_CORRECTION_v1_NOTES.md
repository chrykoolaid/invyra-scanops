# Invyra ScanOps Stage L.1 Dropdown Workflow Correction v1

Baseline carried forward:
- Invyra_ScanOps_StageL_OperationalWorkflowPolish_LauncherContainment_v1.zip

Purpose:
- Preserve the fixed home launcher grid from Stage L.
- Correct the remaining workflow pages where long option grids still made the UI feel unfinished.
- Make dropdown/select controls visibly present and consistent across the operational screens.

Updated behavior:
- Shared TouchSelect now uses the app's Radix/select component instead of a plain browser select.
- Markdowns uses a touch-friendly dropdown for Markdown reason.
- Waste uses a touch-friendly dropdown for Waste reason.
- Expiry Check uses a touch-friendly dropdown for Freshness condition.
- Receiving uses a touch-friendly dropdown for Condition, in addition to the existing Supplier dropdown.
- Replenish uses a touch-friendly dropdown for Issue reason.
- Stock Count uses a touch-friendly dropdown for Variance reason.
- Gap Scan now includes a Gap outcome dropdown so the operator can confirm/correct the outcome before action.
- Gap Scan also shows the gap outcome summary card in the result state.

Preserved:
- Fixed 3-column launcher grid.
- Existing launcher module order.
- Shared compact Scan / Enter Item card.
- Test scenarios remain collapsed by default.
- Transfers step workflow remains in place.
- Shelf Tickets dropdown setup remains in place.
- No direct stock mutation from handheld workflows.
- No real printing claims.

Build check:
- npm run build passed.
