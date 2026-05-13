# Invyra ScanOps Stage AM — Role & Permission Final Hardening v1

Baseline: `Invyra_ScanOps_StageAL_WorkflowFrictionReduction_v1.zip`

Output: `Invyra_ScanOps_StageAM_RolePermissionFinalHardening_v1.zip`

## Purpose

Stage AM is a final safety-lock hardening pass only. It answers whether the wrong role can accidentally see, start, approve, resolve, submit, or force a restricted action.

This build does not add a role system, login redesign, permission editor, staff management, device management, new workflow tile, new dashboard, new filter panel, printer routing, desktop sync transport, or inventory mutation engine.

## Role model preserved

The existing role set remains unchanged:

- Staff
- Supervisor
- Manager
- Admin

No extra retail roles were added.

## Screens and entry points inspected

- Home launcher / App routes
- Operational Menu panel
- Device / shift status panel
- Scanner settings panel
- Supervisor override panel
- Product Identity Review route
- ScanOps Reporting route
- Device & Shift Governance route
- Desktop Sync Contract route
- Store Ops Dashboard route
- Markdown approval queue
- Waste review queue
- Sync Status / Sync Review detail
- Existing workflow paths for Product Lookup, Receiving, Stock Count, Replenishment, Price / Promo Check, Shelf Tickets, Markdowns, Waste, Transfers, and Tasks

## Guards added or tightened

### Shared permission helpers

- Added short restricted-action reason helper:
  - `Supervisor required`
  - `Manager required`
  - `Admin only`
  - `Not available`
- Added a lightweight role guard result helper for future guarded actions.

### Direct route guards

Added route-level access protection for existing restricted routes:

- Product Identity Review — Supervisor+
- ScanOps Reporting — Supervisor+
- Device & Shift Governance — Manager+
- Desktop Sync Contract — Manager+
- Store Ops Dashboard — Manager+

Blocked route access now renders a short local locked state instead of exposing the restricted workspace.

### Operational Menu hardening

- Staff no longer gets direct access to manager/admin menu nodes filtered by `minRole`.
- Menu click handlers now check role before routing or opening panels.
- Direct panel open attempts are guarded.
- UAT role preview is Admin-only.
- Manager-only scanner settings remain hidden from Staff with a short `Manager required` state.
- Supervisor override approval is hidden from Staff; Staff can still request supervisor override.
- Blocked attempts are audit-recorded with short reasons.

### Markdown approval queue

- Staff still creates markdown requests where allowed.
- Staff no longer sees active Approve / Return / Reject controls for pending approval states.
- Restricted markdown approval states show a short reason only, such as `Supervisor required` or `Manager approval required`.
- Existing action handlers still guard submit, approval, reject, and label handoff execution.

### Waste review queue

- Staff can submit waste review evidence where allowed.
- Staff no longer sees active Approve / Return / Reject controls for supervisor/manager review states.
- Adjustment contract creation remains Manager+ only.
- Restricted review/contract states show short reasons only.
- Existing handlers still guard submit, review decision, and adjustment contract execution.

### Sync Status / Sync Review

- Staff can still inspect own/device sync status and escalate with a note.
- Staff can no longer run conflict-review actions such as Keep Local as Evidence, Refresh Server Value, Keep Duplicate as Separate Evidence, or discard failed/conflict review records.
- Sync conflict/review execution is guarded at the handler level as well as the UI level.
- Blocked restricted actions are audit-recorded with `Supervisor required`.

### Device & Shift Governance

- The demo governance reset remains Admin-only.
- Non-admin users see a short `Admin only` state instead of an exposed disabled admin action.
- Blocked reset attempts record `Admin only`.

## Explicit non-changes

- Home launcher visual structure was not redesigned.
- Keyboard behavior was not changed.
- No new workflow tiles were added.
- No new filters were introduced.
- No dashboard-style cards were added.
- No permission matrix or role editor was created.
- No staff or device admin module was created.
- No login/authentication provider was added.
- No printer routing or live printer connection work was added.
- No desktop sync transport or backend RBAC engine was added.
- No live inventory, price, promotion, accounting, or product-master mutation logic was added.

## Validation commands

Run before release:

```bash
npm run lint
npm run build
```

## Acceptance-test focus

- Home launcher remains stable.
- Keyboard remains stable.
- Product Lookup, Receiving, Stock Count, Replenishment, Price / Promo Check, Shelf Tickets, Markdowns, Waste, and Transfers remain reachable.
- Staff cannot see irrelevant manager/admin action buttons.
- Staff cannot trigger restricted review/approval/sync-resolution actions through handlers.
- Supervisor retains existing operational review access.
- Manager retains existing manager-level review and diagnostic access.
- Admin retains broad existing access.
- Restricted visible actions use short reasons only.
- No new roles, admin screens, filters, workflow tiles, or text-wall explanations were added.
