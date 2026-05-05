**Welcome to your Base44 project**

This project contains the Invyra ScanOps handheld scanner prototype.

## Invyra ScanOps stage status

Current package: Stage G — Inventory Sync Foundation with PLU / GTIN / SKU support.

Active scanner workflows:
- Product Lookup
- Stock Count
- Receiving
- Replenish
- Gap Scan
- Markdowns
- Waste
- Expiry Check
- Tasks
- Inventory Sync

Stage G connects ScanOps to an Invyra Inventory sync foundation. The Inventory system is treated as the source of truth; ScanOps is the handheld execution layer. Scanner workflows now use a shared local inventory snapshot and create sync-aware inventory events.

Stage G adds:
- Inventory Sync tile and dedicated Inventory Sync page
- Local inventory snapshot cache
- Product identity resolver for PLU, GTIN/barcode, SKU, scale code, internal item ID, batch, and lot
- Demo adapter for future Invyra Inventory API wiring
- Offline / online demo network mode
- Local sync queue
- Retry and Push Queue actions
- Honest sync states: saved on device, waiting to sync, syncing, synced, failed, conflict, needs review
- App-wide sync banner on scanner workflow pages

Home remains a clean 3-column scanner launcher. No inventory sync list, task list, or queue display is shown on Home.

Still deferred:
- Stage H Decision Engine
- Stage I Labels full engine
- Stage I Transfers
- Stage J final role/device/audit hardening
- Full conflict resolver
- Real multi-device backend merge logic

## Local run

```bash
npm install
npm run dev
```


## Stage H — Decision Engine Foundation

Stage H adds deterministic supermarket decisioning to existing ScanOps workflows. It does not add a Home tile and does not redesign the 3-column launcher.

Decision rule:

```text
Decision Engine recommends.
Operator confirms.
Inventory system applies after sync.
```

Added foundations:

- `src/lib/scanOpsDecisionEngine.js`
- `src/lib/scanOpsDecisionRules.js`
- `src/lib/scanOpsDecisionFixtures.js`
- `src/components/scanner/DecisionRecommendationCard.jsx`

Recommendation outputs include:

```text
recommendedAction
confidence
reasonText
riskLevel
requiredRole
linkedWorkflow
eventToCreate
taskToCreate
```

Events added:

```text
DECISION_RECOMMENDATION_GENERATED
DECISION_RECOMMENDATION_ACCEPTED
DECISION_RECOMMENDATION_REJECTED
DECISION_RECOMMENDATION_OVERRIDDEN
DECISION_SUPERVISOR_REVIEW_REQUIRED
DECISION_TASK_CREATED
DECISION_REASON_VIEWED
```

Acceptance rules:

- Recommendations appear inside Gap Scan, Replenish, Markdowns, Waste, Expiry Check, and Task Detail.
- Accept/reject writes decision events.
- Decision events flow into Inventory Sync.
- No recommendation directly mutates official inventory truth.
- Home remains clean with no Decision Engine tile.
