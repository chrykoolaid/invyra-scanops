# Invyra ScanOps Stage AA — Replenishment / Backroom-to-Shelf Execution v1

Baseline: `Invyra_ScanOps_StageZ_AdminReportingWorkspace_v1.zip`

## Scope delivered

Stage AA rebuilds the existing `/replenish` workflow into a pilot-ready replenishment execution workspace.

The stage is intentionally focused on shop-floor execution evidence:

- scan/search item from the existing header pattern
- show compact item identity card
- show shelf/backroom need, location, and suggested movement
- choose reason with pressable buttons
- choose outcome with pressable action buttons
- record quantity moved/requested
- capture evidence/operator notes
- persist replenishment task/activity locally
- write ScanOps event records with user/device/session proof
- queue the event through the existing ScanOps sync/event pipeline

## Hard locks preserved

- Home launcher was not changed.
- Keyboard/header search component was not changed.
- Product Lookup route was not changed.
- Stage Z Reporting page was not structurally changed.
- No direct stock quantity mutation was added.
- No forecasting was added.
- No desktop sync API implementation was added.
- No toast behavior was added.

## Files changed

- `src/pages/Replenish.jsx`
  - Rebuilt the Replenishment workspace UI.
  - Added shelf/backroom status panel, reason buttons, outcome buttons, evidence notes, sticky submit actions, and recent replenishment activity list.

- `src/lib/scanOpsReplenishment.js`
  - New local replenishment task/event contract.
  - Adds local persistence under `invyra_scanops_replenishment_tasks_v1`.
  - Adds shelf need derivation, recommended movement, item snapshotting, and save logic.

- `src/lib/scanOpsEvents.js`
  - Added Stage AA replenishment event types:
    - `REPLENISHMENT_TASK_CREATED`
    - `REPLENISHMENT_SHELF_FILLED`
    - `REPLENISHMENT_SHORT_FILL`
    - `REPLENISHMENT_NO_BACKROOM_STOCK`
    - `REPLENISHMENT_DAMAGED_STOCK`
    - `REPLENISHMENT_WRONG_LOCATION`
    - `REPLENISHMENT_MANAGER_REVIEW_REQUESTED`

## Acceptance test checklist

1. Home launcher remains visually unchanged.
2. Keyboard/search behavior remains unchanged.
3. Open Replenish from Home.
4. Search or scan `930000000001` or search `Coke`.
5. Confirm compact item card appears.
6. Confirm shelf/backroom panel appears with shelf state, backroom state, min shelf, need, suggested move, locations, and planogram status.
7. Select each reason button and confirm selected state changes.
8. Select each outcome button and confirm selected state changes.
9. Submit `Create Task` and confirm saved confirmation appears.
10. Scan item again and submit `Shelf Filled`.
11. Scan item again and submit `Short Fill`.
12. Scan item again and submit `No Backroom Stock`.
13. Scan item again and submit `Damaged / Unsellable`.
14. Scan item again and submit `Wrong Location`.
15. Scan item again and submit `Manager Review`.
16. Confirm replenishment activity list shows submitted records.
17. Switch to another workflow and back to Replenishment; records should persist.
18. Open ScanOps Reporting and confirm it still opens without layout breakage.
19. Confirm Product Lookup still works.
20. Confirm no horizontal scrolling is introduced.
21. Confirm no intrusive toast behavior appears.
