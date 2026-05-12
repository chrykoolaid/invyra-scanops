# Invyra ScanOps Stage AB — Price Check + Promotion Label Verification v1

Baseline used:

```text
Invyra_ScanOps_StageAA_ReplenishmentExecution_v1.zip
```

## Scope completed

Stage AB adds a dedicated handheld Price Check workflow for shelf-price and promotion-label verification.

Implemented behavior:

```text
Scan/search item
→ show compact item card
→ show regular system price
→ show active promo state when available
→ enter shelf-label price
→ mark promo label visible Yes/No
→ select verification result
→ optionally select reason and note
→ submit local verification event
```

## Locked boundaries preserved

```text
- Home launcher file was not changed.
- Existing keyboard/header search behavior was not redesigned.
- Stage AA Replenishment files were not changed.
- Stage Z Reporting page was not redesigned.
- Product Lookup behavior was not changed.
- No product price records are mutated.
- No promotion records are created or edited.
- No printer integration or print contract was added.
- No full pricing or promotion engine was added.
```

## Files added

```text
src/pages/PriceCheck.jsx
src/lib/scanOpsPricePromoVerification.js
INVYRA_SCANOPS_STAGE_AB_PRICE_PROMO_VERIFICATION_v1_NOTES.md
```

## Files updated

```text
src/App.jsx
src/components/scanner/OperationalMenuPanel.jsx
src/lib/scanOpsEvents.js
```

## New route

```text
/price-check
```

The Home launcher remains untouched. Price Check can be opened from the Operational Menu under Daily Controls.

## Local storage added

```text
invyra_scanops_price_promo_verification_events_v1
```

The Stage AB helper exposes:

```text
getPriceVerificationEvents()
getPromotionVerificationEvents()
getLabelMismatchEvents()
getAllPricePromoVerificationEvents()
```

## Verification result buttons

```text
Label Correct
Price Mismatch
Promo Missing
Promo Expired
Wrong Label
Ticket Needed
Manager Review
```

## Reason buttons

```text
Shelf label higher than system
Shelf label lower than system
Promo price not displayed
Old promo still displayed
Wrong item ticket
Missing ticket
Unclear / damaged label
```

## Event types added

```text
PRICE_LABEL_VERIFIED
PRICE_MISMATCH_RECORDED
PROMO_LABEL_VERIFIED
PROMO_LABEL_MISSING
PROMO_LABEL_EXPIRED
WRONG_PRODUCT_LABEL_RECORDED
SHELF_TICKET_REQUESTED_FROM_PRICE_CHECK
PRICE_CHECK_MANAGER_REVIEW_REQUESTED
```

## Stage AC handoff behavior

`Ticket Needed` records `requestedShelfTicket: true` and `print_contract_created: false`.

This gives Stage AC enough source evidence to build Shelf Ticket Queue v2 later without introducing print contracts in Stage AB.

## Build verification

```text
npm ci --prefer-offline --no-audit --no-fund
npm run build
```

Build completed successfully.
