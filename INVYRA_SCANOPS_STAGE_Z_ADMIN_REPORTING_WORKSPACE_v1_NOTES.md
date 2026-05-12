# Invyra ScanOps Stage Z — Admin / Reporting Workspace v1

Baseline:
- Invyra_ScanOps_StageY_OfflineSyncConflictResolution_v1.zip

Output:
- Invyra_ScanOps_StageZ_AdminReportingWorkspace_v1.zip

## Scope delivered

Stage Z adds a role-gated ScanOps Reporting workspace for Supervisor, Manager, and Admin visibility into scanner operations. It is a read-only management visibility surface only.

The Stage Z pass adds:
- `/scanops-reporting` route.
- ScanOps Reporting page with header, role scope badge, date range buttons, compact filters, KPI cards, Queue Health, Workflow Exceptions, Evidence Quality, Device & User Activity, and Recent ScanOps Events.
- Role gate:
  - Staff cannot see ScanOps Reporting in the Operational Menu.
  - Staff direct route access shows Access Restricted.
  - Supervisor / Manager / Admin can open the workspace from the Operational Menu.
- Read-only deep links into existing workflows:
  - Sync Queue
  - Tasks
  - Product Identity Review
  - Stock Count
  - Receiving
  - Transfers
  - Waste / Markdowns / Shelf Tickets surfaces through visibility cards
- Reporting aggregation helper using existing local ScanOps stores where available.
- Neutral evidence-quality counts without AI scoring or staff discipline framing.
- Device and user activity summaries using existing events / queue / task evidence.
- Recent ScanOps event feed.

## Hard locks preserved

- Home launcher grid was not redesigned.
- Keyboard behavior was not changed.
- Shared search resolver was not changed.
- Compact item result cards were not changed.
- No toast behavior was added.
- No horizontal-scroll patterns were added.
- Product Identity Review remains intact.
- Expiry / lot / weighted evidence remains intact.
- Stock Count session governance remains intact.
- Receiving / Transfer exception hardening remains intact.
- Stage X Tasks remain intact.
- Stage Y Sync Queue remains intact.

## Files changed

- `src/App.jsx`
  - Added `/scanops-reporting` route.

- `src/components/scanner/OperationalMenuPanel.jsx`
  - Added role-gated ScanOps Reporting entry for Supervisor / Manager / Admin.
  - Staff does not see the reporting entry.

- `src/lib/scanOpsReporting.js`
  - New read-only reporting aggregation helper.
  - Adds role rules, scope labels, KPI definitions, queue health, workflow exceptions, evidence quality, device/user activity, and event feed helpers.

- `src/pages/ScanOpsReporting.jsx`
  - New management reporting workspace UI.
  - Read-only cards and navigation-only actions.
  - Staff direct-route access restriction.

- `INVYRA_SCANOPS_STAGE_Z_ADMIN_REPORTING_WORKSPACE_v1_NOTES.md`
  - Stage summary and testing notes.

## Validation performed

- `npm ci`
- `npm run build`
- `npm run lint`

Both build and lint completed successfully after dependencies were installed from the included lockfile.

## Suggested test pass

1. Open the app as Staff.
2. Confirm Home launcher layout is unchanged.
3. Open Operational Menu and confirm ScanOps Reporting is hidden.
4. Manually route to `/scanops-reporting` and confirm Access Restricted.
5. Switch role preview to Supervisor.
6. Open Operational Menu and confirm ScanOps Reporting appears.
7. Open ScanOps Reporting and confirm Team view badge.
8. Test Today / 7 Days / 30 Days buttons.
9. Test Workflow / Department / Device / User filters.
10. Confirm KPI cards render without clipping.
11. Confirm Queue Health view buttons only navigate.
12. Confirm no reporting card resolves sync items, approves counts, posts inventory, links aliases, or closes exceptions.
13. Switch to Manager and confirm Store view badge.
14. Switch to Admin and confirm Diagnostic view badge.
15. Confirm Product Lookup, keyboard behavior, Tasks, Sync Queue, Product Identity Review, Stock Count, Receiving, and Transfers still open normally.
16. Confirm no toasts and no horizontal scrolling.
