# Invyra ScanOps Stage H — Decision Engine Foundation v1

Baseline: `Invyra_ScanOps_StageG_Inventory_Sync_Foundation_v1.zip`

## Scope completed

Stage H adds a deterministic decision engine foundation across existing scanner workflows.

## Added files

- `src/lib/scanOpsDecisionEngine.js`
- `src/lib/scanOpsDecisionRules.js`
- `src/lib/scanOpsDecisionFixtures.js`
- `src/components/scanner/DecisionRecommendationCard.jsx`

## Updated files

- `src/pages/GapScan.jsx`
- `src/pages/Replenish.jsx`
- `src/pages/Markdowns.jsx`
- `src/pages/Waste.jsx`
- `src/pages/ExpiryCheck.jsx`
- `src/pages/Tasks.jsx`
- `src/pages/InventorySync.jsx`
- `src/lib/scanOpsEvents.js`
- `src/lib/scanOpsTasks.js`
- `README.md`

## Locked behavior

- Home remains a clean 3-column launcher.
- No Decision Engine tile was added.
- Recommendations are deterministic rule outputs, not AI.
- Recommendations do not silently mutate official stock truth.
- Operator confirmation is required before action events are written.
- Accept/reject/override/reason-view events are queued through Stage G Inventory Sync.
- Gap Scan can create a linked replenishment task from a decision.
- Task Detail now shows priority/supervisor-review decisioning.

## Events added

- `DECISION_RECOMMENDATION_GENERATED`
- `DECISION_RECOMMENDATION_ACCEPTED`
- `DECISION_RECOMMENDATION_REJECTED`
- `DECISION_RECOMMENDATION_OVERRIDDEN`
- `DECISION_SUPERVISOR_REVIEW_REQUIRED`
- `DECISION_TASK_CREATED`
- `DECISION_REASON_VIEWED`

## Test checklist

1. Home remains 3 columns and no Decision Engine tile appears.
2. Product identity still resolves barcode / GTIN / SKU / PLU items.
3. Gap Scan displays recommendation, confidence, reason, risk, role, and next event.
4. Gap Scan backroom-available can create a linked replenishment task.
5. Replenish displays a deterministic quantity/move recommendation.
6. Markdowns displays deterministic markdown recommendation and accept/reject events.
7. Waste routes high-risk items to supervisor review.
8. Expiry Check recommends markdown, waste, review, monitor, or no action.
9. Task Detail displays task-priority / supervisor-review decisioning.
10. Inventory Sync shows decision events in the queue.
11. Offline mode queues decision events honestly.
12. No stock is silently mutated by a recommendation.
