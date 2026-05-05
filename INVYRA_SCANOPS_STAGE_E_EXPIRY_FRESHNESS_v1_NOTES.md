# Invyra ScanOps — Stage E Expiry / Freshness Engine v1

Baseline: `Invyra_ScanOps_StageD_Markdowns_Waste_v1.zip`

## Stage E goal

Add the handheld scanner workflow for expiry and freshness checks while preserving Stage A/B/C/D behavior.

## Active workflows after this pass

- Product Lookup
- Stock Count
- Receiving
- Replenish
- Gap Scan
- Markdowns
- Waste
- Expiry Check

## Still intentionally inactive

- Stage F Task System
- Stage G Offline + Sync Queue
- Stage H Decision Engine / AI
- Stage I Labels full engine + Transfers
- Stage J Role / Device / Audit hardening

## Files added

- `src/pages/ExpiryCheck.jsx`
- `INVYRA_SCANOPS_STAGE_E_EXPIRY_FRESHNESS_v1_NOTES.md`

## Files updated

- `src/App.jsx`
- `src/pages/Home.jsx`
- `src/lib/scanOpsEvents.js`
- `src/lib/scanOpsInventoryFixtures.js`
- `src/lib/scanOpsRules.js`
- `README.md`

## Events added

- `EXPIRY_CHECK_RECORDED`
- `FRESHNESS_CHECK_RECORDED`
- `EXPIRY_MARKDOWN_RECOMMENDED`
- `EXPIRY_WASTE_RECOMMENDED`
- `FRESHNESS_REVIEW_REQUIRED`
- `EXPIRY_DATE_UPDATED`

## Test checklist

1. Expiry Check tile opens from Home.
2. Stage A/B/C/D tiles still open.
3. Expiry Check screen has no horizontal scrolling.
4. Simulate Scan opens the default dairy near-expiry scenario.
5. Test scenario buttons open dairy, meat, and produce cases.
6. Item details display item name, SKU, category, department, location, and stock context.
7. Expiry date input calculates status clearly.
8. Freshness condition uses large buttons, not dropdowns.
9. Record Check writes `EXPIRY_CHECK_RECORDED` and `FRESHNESS_CHECK_RECORDED`.
10. Changing the date before recording also writes `EXPIRY_DATE_UPDATED`.
11. Expired meat recommends waste / review.
12. Near-expiry dairy recommends markdown.
13. Produce condition issue can recommend review.
14. Recommendation action writes the relevant recommendation event.
15. No Stage F/G/H/I/J features appear.
16. No fake completed Home task history appears.
