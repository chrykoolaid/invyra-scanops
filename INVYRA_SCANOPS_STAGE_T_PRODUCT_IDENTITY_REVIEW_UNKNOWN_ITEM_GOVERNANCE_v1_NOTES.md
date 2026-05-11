# Invyra ScanOps Stage T
## Product Identity Review + Unknown Item Governance v1

Baseline:
`Invyra_ScanOps_StageS_PLUBarcodeAliasSearchIntelligence_v1.zip`

## Scope delivered

Stage T adds a governed Product Identity Review workspace for unknown item evidence, barcode alias review, PLU issue review, and resolved review proof.

This stage intentionally does **not** create real products, mutate live inventory, mutate stock, mutate prices, or add printer integration.

## Hard locks preserved

- Home launcher not edited.
- Keyboard not redesigned.
- Stage S shared search resolver kept.
- Compact item result cards kept.
- No-toast rule kept; review feedback is inline only.
- No horizontal scrolling pattern preserved.
- Handheld actions create governance evidence only.

## Files added

- `src/pages/ProductIdentityReview.jsx`
- `src/lib/scanOpsProductIdentityReview.js`
- `INVYRA_SCANOPS_STAGE_T_PRODUCT_IDENTITY_REVIEW_UNKNOWN_ITEM_GOVERNANCE_v1_NOTES.md`

## Files updated

- `src/App.jsx`
  - Added `/product-identity-review` route.

- `src/components/scanner/OperationalMenuPanel.jsx`
  - Added Product Identity Review entry to the operational menu.
  - Home launcher remains untouched.
  - Updated About panel stage copy to Stage T.

- `src/lib/scanOpsUnknownItems.js`
  - Added review-state constants.
  - Added evidence update helper for review workflow status changes.

- `src/lib/scanOpsEvents.js`
  - Added product identity review event types.

- `src/lib/scanOpsPermissions.js`
  - Added product identity review role gating helper.
  - Staff remains evidence-only; Supervisor/Manager/Admin can review.

## Backend / local contract introduced

Local storage contract names mirror the future backend tables:

```text
unknown_item_evidence
product_alias_review
product_identity_links
identity_review_events
```

The following local storage keys are used in this prototype layer:

```text
invyra_scanops_unknown_item_evidence_v1
invyra_scanops_product_alias_review_v1
invyra_scanops_product_identity_links_v1
invyra_scanops_identity_review_events_v1
```

## Product Identity Review behavior

Tabs:

```text
Needs Review
Alias Conflicts
PLU Issues
Resolved
```

Actions:

```text
Link as Alias
Reject
Escalate
Defer
```

Role behavior:

```text
Staff:
- Can submit unknown item evidence from workflows.
- Can view Product Identity Review.
- Cannot link, reject, escalate, or defer evidence.
- Blocked attempts are audit/event recorded.

Supervisor / Manager / Admin:
- Can review unknown item evidence.
- Can link evidence as alias proof.
- Can reject evidence.
- Can escalate evidence.
- Can defer evidence.
```

Mutation guard:

```text
createsProduct: false
appliesStockDirectly: false
appliesPriceDirectly: false
stock_mutation: false
price_mutation: false
```

## Acceptance test checklist

```text
T-A1. Home screen unchanged.
T-A2. Keyboard unchanged.
T-A3. Product Lookup search still works.
T-A4. PLU search still works.
T-A5. Alias barcode search still works.
T-A6. Unknown item evidence can still be submitted.
T-A7. Unknown item evidence appears in Product Identity Review.
T-A8. Staff can submit evidence but cannot approve alias/product links.
T-A9. Supervisor/Manager/Admin can review evidence.
T-A10. Link as Alias records review proof but does not mutate stock.
T-A11. Reject Evidence records review proof.
T-A12. Escalate records review proof.
T-A13. Resolved evidence leaves Needs Review.
T-A14. Sync Queue remains intact.
T-A15. No toasts.
T-A16. No horizontal clipping.
```

## Verification performed

```text
npm install --no-audit --no-fund
npm run build
npm run lint
```

Both build and lint passed in the package workspace.
