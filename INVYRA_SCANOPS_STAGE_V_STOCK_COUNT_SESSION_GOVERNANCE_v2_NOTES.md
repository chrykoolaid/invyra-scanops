# Invyra ScanOps Stage V — Stock Count Session Governance v2

Baseline: `Invyra_ScanOps_StageU_ExpiryLotWeightedEvidence_v1.zip`

## Summary

Stage V turns Stock Count into a session-first workflow. The handheld now captures count evidence inside controlled sessions with status, assignment, variance review, recount request/completion, approval, and close states. The handheld still does not directly mutate live stock or pricing.

## Updated files

- `src/pages/StockCount.jsx`
  - Rebuilt Stock Count into a session workspace.
  - Added Active Sessions landing.
  - Added Start New Count Session flow.
  - Added session header with status, area, assignment, items, variances, recounts, and no-direct-stock-adjustment proof.
  - Preserved Stage U expiry / lot / weighted evidence fields on count lines.
  - Added expected-unavailable handling instead of fake expected quantities.
  - Added inline variance review cards.
  - Added item-specific recount workflow that preserves original count evidence.
  - Added role-aware review/approve/close behavior.
  - Removed loose count-only flow.

- `src/lib/scanOpsStockCount.js`
  - Added local session governance contract and storage helpers for:
    - `count_sessions`
    - `count_session_items`
    - `count_item_attribute_snapshots`
    - `count_variance_rules`
    - `count_recount_requests`
    - `count_recount_evidence`
    - `count_approval_events`
  - Added Stage V statuses:
    - Draft
    - In Progress
    - Submitted
    - Review Required
    - Recount Required
    - Approved
    - Closed
    - Cancelled
  - Added variance states:
    - No Variance
    - Within Tolerance
    - Review Required
    - Recount Requested
    - Recount Completed
    - Accepted
    - Rejected
    - Expected Unavailable
  - Added role helper functions for review, approval, close, and visibility.
  - Added recount and approval event helpers.

- `src/lib/scanOpsEvents.js`
  - Added Stage V event types for session creation, recount request, recount submit, evidence acceptance, approval, close, and cancellation.

- `src/components/scanner/WorkflowHeader.jsx`
  - Added Product Identity Review routing after unknown item evidence is saved.
  - Preserves Stage T unknown item evidence behavior and still creates no product, stock, price, markdown, transfer, or ticket action automatically.

## Hard locks preserved

- Home launcher untouched.
- Keyboard design untouched.
- Shared search resolver intact.
- Product Identity Review path intact.
- Stage U expiry / lot / weighted evidence preserved.
- Compact card style preserved.
- No toast messages added.
- No horizontal table layout added.
- No direct live stock mutation added.
- No product auto-creation added.
- No pricing logic added.
- No printer integration added.
- No full offline conflict resolution added.
- No reporting dashboard added.

## Test checklist

1. Home screen unchanged.
2. Keyboard behavior unchanged.
3. Product Lookup still works.
4. PLU search still works.
5. Alias barcode search still works.
6. Unknown search can still create Product Identity Review evidence and now offers Open Review.
7. Stock Count opens to Active Sessions.
8. Start New Count Session creates an In Progress session.
9. Add item count evidence inside the session.
10. Count evidence saves against the correct session.
11. Expiry / lot / weighted / condition evidence remains visible on count lines.
12. Known expected quantity shows variance.
13. Expected-unavailable items do not show fake expected values.
14. Submit session makes it read-only for Staff.
15. Supervisor / Manager / Admin can review submitted/review-required sessions.
16. Request Recount changes item/session to recount state.
17. Submit Recount preserves original count and adds separate recount evidence.
18. Accept Evidence marks a line accepted without stock mutation.
19. Approve Session does not mutate stock.
20. Manager/Admin can close an approved session.
21. Sync Queue remains intact through event capture.
22. No toasts.
23. No horizontal clipping.

## Recommended ZIP output

`Invyra_ScanOps_StageV_StockCountSessionGovernance_v2.zip`

## Git commit

```powershell
git add .
git commit -m "Add ScanOps Stage V stock count session governance"
git push
```
