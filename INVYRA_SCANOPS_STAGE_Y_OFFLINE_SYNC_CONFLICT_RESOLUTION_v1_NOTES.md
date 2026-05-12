# Invyra ScanOps Stage Y — Offline Sync Conflict Resolution v1

Baseline: `Invyra_ScanOps_StageX_TaskIntelligence_AssignmentHardening_v1.zip`

## Scope delivered

Stage Y upgrades Sync Queue from a basic pending/failed upload list into a conflict-aware recovery workspace.

Implemented:

- Pending / Failed / Conflicts / Synced / Discarded tabs.
- Compact workflow, state, device, user, and age filters.
- Role-scoped queue visibility:
  - Staff: own user/device records.
  - Supervisor: team/store records.
  - Manager: store records.
  - Admin: all records.
- Expanded sync states:
  - Pending
  - Syncing
  - Synced
  - Failed
  - Needs Review
  - Conflict
  - Duplicate
  - Discarded
  - Escalated
- Failed sync retry guard:
  - Technical failures can be retried.
  - Conflict / duplicate / discarded / escalated states do not retry directly.
- Conflict detail workspace:
  - Local evidence snapshot.
  - Server/source snapshot.
  - Snapshot hashes.
  - Failure/conflict reason.
  - Sync history.
- Failed sync detail workspace:
  - Failure reason.
  - Attempt count.
  - Local evidence preserved.
  - Retry / Escalate / Discard options.
- Duplicate detection:
  - Duplicate key built from workflow, source, line/item identity, and event type.
  - Duplicate records are explicitly marked as Duplicate rather than silently creating active duplicates.
  - Matching evidence is shown.
  - Keep as Separate Evidence is role-gated to Supervisor / Manager / Admin.
- Resolution actions:
  - Keep Local as Evidence.
  - Refresh Server Value.
  - Escalate.
  - Discard Local Draft.
  - Keep Duplicate as Separate Evidence.
- Escalation creates or updates a linked Stage X task through the existing task system.
- Resolution events are stored separately for audit proof.
- Snapshot hashes, server snapshot refs, sync attempts, and conflict records are persisted.

## Safety locks preserved

- Home launcher untouched.
- Keyboard untouched.
- Product Lookup untouched.
- Product Identity Review untouched.
- Expiry / lot / weighted evidence untouched.
- Stock Count governance untouched.
- Receiving and Transfer exception workflows untouched.
- Stage X Tasks remain intact and are linked only on escalation.
- Sync Queue remains evidence/recovery only.

## Explicit no-mutation behavior

Sync Queue actions do not:

- Mutate live stock.
- Approve stock count sessions.
- Approve receiving exceptions.
- Close transfer reconciliation.
- Create products.
- Create barcode aliases.
- Apply markdowns.
- Post waste.
- Print shelf tickets.

## Files updated

- `src/lib/scanOpsSync.js`
  - Rebuilt as Stage Y conflict-aware sync state / evidence / resolution contract.
- `src/pages/SyncQueue.jsx`
  - Rebuilt as the Stage Y recovery workspace UI.
- `INVYRA_SCANOPS_STAGE_Y_OFFLINE_SYNC_CONFLICT_RESOLUTION_v1_NOTES.md`
  - Added stage summary and acceptance notes.

## Verification run

- `npm run build` passed.
- `npm run lint` passed.
- `npm run typecheck` still reports existing project-wide JS/TS inference errors in unrelated baseline files such as `TouchSelect.jsx`, `WorkflowHeader.jsx`, `components/ui/select.jsx`, `scanOpsReceivingTransfers.js`, `scanOpsTasks.js`, `Markdowns.jsx`, `Receiving.jsx`, `StockCount.jsx`, and `Waste.jsx`. No Stage Y files appeared in the typecheck error list.

## Recommended output package

`Invyra_ScanOps_StageY_OfflineSyncConflictResolution_v1.zip`
