# Invyra ScanOps Stage U — Expiry / Lot / Weighted Barcode Evidence v1

Baseline: `Invyra_ScanOps_StageT_ProductIdentityReview_UnknownItemGovernance_v1.zip`

## Goal
Capture expiry, lot/batch, and weighted-item evidence across key ScanOps workflows without mutating live inventory, creating products, calculating prices, printing labels, or implementing full GS1/scale integration.

## Stage U implementation summary

### Added
- Shared attribute evidence helper: `src/lib/scanOpsItemAttributes.js`
  - expiry evidence snapshot
  - lot/batch evidence snapshot
  - weighted item evidence snapshot
  - workflow item attribute snapshot
  - local evidence storage helpers
  - weighted barcode candidate detection for 13-digit barcodes beginning with `2`
  - handheld-friendly quantity type and weight source options
- Shared compact UI component: `src/components/scanner/AttributeEvidenceFields.jsx`
  - Expiry date field
  - Lot / Batch field
  - Weighted barcode candidate evidence block when relevant
  - Quantity type dropdown
  - Weight field
  - Weight source dropdown

### Updated workflows
- `src/pages/Waste.jsx`
  - expiry date capture
  - lot/batch capture
  - weighted quantity evidence capture
  - evidence snapshot saved into waste line and local evidence stores
  - review/current waste log displays captured attribute summary
  - no direct stock mutation
- `src/pages/Markdowns.jsx`
  - expiry/lot capture for short-dated markdown evidence
  - weighted evidence capture where relevant
  - evidence snapshot saved into markdown request line
  - no direct price mutation
- `src/pages/Receiving.jsx`
  - expiry/lot capture while receiving perishable stock
  - weighted evidence capture where relevant
  - evidence snapshot saved into receiving request line
  - no direct stock posting or PO closure
- `src/pages/StockCount.jsx`
  - expiry note capture
  - lot/batch capture
  - condition note dropdown
  - weighted evidence capture where relevant
  - evidence snapshot saved into count line
  - no direct stock adjustment
- `src/pages/ProductLookup.jsx`
  - displays attribute capture capability: Expiry, Lot / Batch, Weighted evidence
  - keeps actual capture inside operational workflows

### Backend/local contract added
Local storage-backed evidence records now map to the Stage U evidence contract:
- `scan_item_attributes`
- `expiry_evidence`
- `lot_batch_evidence`
- `weighted_item_evidence`
- `workflow_item_attribute_snapshot`

### Product data support
- Added a demo random-weight barcode alias `2201234506789` to the existing Chicken Breast random-weight item.
- This enables weighted barcode candidate evidence without implementing full GS1 parsing or scale integration.

## Locked behaviours preserved
- Home launcher unchanged.
- Keyboard component unchanged.
- Product Identity Review remains intact.
- Shared search resolver remains intact.
- Unknown item evidence path remains intact.
- No toasts added.
- No direct stock mutation from handheld.
- No direct price mutation from handheld.
- No product creation from captured labels.
- No printer integration.
- No full GS1 parsing.
- No scale integration.

## Manual test checklist
- Product Lookup still resolves barcode / PLU / alias / name.
- Waste captures expiry, lot/batch, and weighted evidence and shows it in current/review lists.
- Markdown captures expiry and lot/batch and remains request-only.
- Receiving captures expiry and lot/batch and remains evidence-only.
- Stock Count captures expiry note, lot/batch, condition note, and weighted evidence without direct stock mutation.
- Weighted demo barcode `2201234506789` resolves to the random-weight Chicken item and shows weighted evidence capture.
- Unknown item evidence still routes to Product Identity Review when no match is found.
- Sync Queue remains available.
- No horizontal clipping introduced.
