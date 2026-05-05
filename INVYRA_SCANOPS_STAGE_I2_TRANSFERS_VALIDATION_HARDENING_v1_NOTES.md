# Invyra ScanOps Stage I.2 — Transfers Validation Hardening v1

Baseline used:

```text
Invyra_ScanOps_StageI_ShelfTickets_Transfers_Foundation_v1.zip
```

## Scope

Focused transfer hardening only. Shelf Tickets and the Stage I Home launcher direction were not reopened.

## What was fixed

```text
Transfer source and destination are no longer prefilled.
The operator must select/scan source and destination before confirming.
TRANSFER_STARTED is now written when Transfers opens.
TRANSFER_REVIEWED is now written before success, block, or review-required outcomes.
Damaged, expiry, freshness, and promo display transfers now expose reason buttons.
Damaged and expiry transfers require a reason before confirmation.
Quantity above local snapshot is no longer treated like a normal completed transfer.
Quantity above local snapshot creates supervisor-review and exception events.
Review-required transfer events are held in Inventory Sync with Needs review status.
Retry all no longer pushes Needs review events as if a supervisor had approved them.
```

## Transfer review behavior

Normal transfer:

```text
TRANSFER_REVIEWED
TRANSFER_COMPLETED
TRANSFER_QUEUED_FOR_SYNC
```

Review-required transfer:

```text
TRANSFER_REVIEWED
TRANSFER_SUPERVISOR_REVIEW_REQUIRED
TRANSFER_EXCEPTION_RECORDED
TRANSFER_QUEUED_FOR_SYNC with review_required status
```

Important:

```text
ScanOps still does not directly mutate official stock.
Official movement remains owned by Invyra Inventory after sync/approval.
Final supervisor approval workflow is still deferred to Stage J / role-device-audit hardening.
```

## Files updated

```text
src/pages/Transfers.jsx
src/components/scanner/TransferReviewCard.jsx
src/lib/scanOpsTransfers.js
src/lib/scanOpsTransferRules.js
src/lib/scanOpsSync.js
README.md
```

## Testing checklist

```text
1. Open Transfers and confirm no source/destination are preselected.
2. Try Confirm immediately; source-required validation should appear.
3. Select source, scan item, select destination, confirm normal transfer.
4. Confirm normal transfer queues TRANSFER_COMPLETED and TRANSFER_QUEUED_FOR_SYNC.
5. Set source and destination to the same location; confirm is blocked.
6. Raise quantity above available snapshot; result should be supervisor review, not completed.
7. Confirm review-required transfer appears in Inventory Sync as Needs review.
8. Select Damaged → Holding without reason; confirm is blocked.
9. Select Damaged → Holding with reason; confirm can proceed or review as applicable.
10. Confirm no direct stock mutation is shown or implied.
11. Confirm no horizontal scrolling.
```
