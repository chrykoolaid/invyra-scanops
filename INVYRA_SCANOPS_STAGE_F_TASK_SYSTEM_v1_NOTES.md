# Invyra ScanOps Stage F — Task System v1

Baseline updated from:

```text
Invyra_ScanOps_StageE_Expiry_Freshness_v1.zip
```

## Scope completed

Stage F adds a dedicated task queue workflow for ScanOps while removing the Home/Dashboard task display that stretched the launcher UI.

## Home / Dashboard correction

The Home page is now a clean 3-column scanner launcher only.

Removed:

```text
Today's Tasks
No assigned scanner tasks yet
Stage F will add manager-assigned and auto-generated task routing.
```

Added:

```text
Tasks tile → /tasks
```

The task list now lives only inside the dedicated Tasks page.

## New task system

Added:

```text
src/pages/Tasks.jsx
src/lib/scanOpsTasks.js
```

The Tasks page supports:

- Open operational task queue
- Large touch-friendly task cards
- Button filters only
- Task detail workspace
- Start Task
- Complete Task
- Mark Blocked
- Linked workflow navigation
- Staff supervisor-review blocking
- Event proof for task actions

## Task types supported

```text
REPLENISHMENT_TASK
GAP_SCAN_TASK
MARKDOWN_TASK
WASTE_REVIEW_TASK
EXPIRY_CHECK_TASK
FRESHNESS_REVIEW_TASK
STOCK_COUNT_RECHECK_TASK
RECEIVING_FOLLOWUP_TASK
```

## Task statuses supported

```text
Open
In Progress
Blocked
Needs Supervisor
Completed
Cancelled
```

Completed tasks are not seeded as fake history. They only appear after a task is completed during the workflow.

## Events added

```text
TASK_CREATED
TASK_STARTED
TASK_COMPLETED
TASK_BLOCKED
TASK_CANCELLED
TASK_REASSIGNED
TASK_ESCALATED
TASK_LINKED_ACTION_OPENED
TASK_FILTER_CHANGED
```

## Files updated

```text
src/App.jsx
src/pages/Home.jsx
src/lib/scanOpsEvents.js
src/lib/scanOpsRules.js
README.md
```

## Deferred intentionally

```text
Offline Sync
Decision Engine
Labels full engine
Transfers
Final role/device/audit hardening
```

## What to test

1. Home opens with 3-column grid intact.
2. Old Today’s Tasks section is gone.
3. Home no longer stretches due to task display content.
4. Tasks tile opens `/tasks`.
5. Stage A/B/C/D/E tiles still open.
6. Tasks page shows open work clearly.
7. Task cards have no horizontal scrolling.
8. Filters are buttons, not dropdowns.
9. Open Task opens detail workspace.
10. Start Task writes `TASK_STARTED`.
11. Complete Task writes `TASK_COMPLETED` for normal tasks.
12. Mark Blocked writes `TASK_BLOCKED`.
13. Staff cannot complete supervisor-only tasks.
14. Linked workflow button writes `TASK_LINKED_ACTION_OPENED` and opens the existing workflow.
15. Stage G/H/I/J features remain inactive.
