# Invyra ScanOps Stage K.1 — Remove Scanner Frames + Compact Scan Entry v1

## Baseline
Built from:
`Invyra_ScanOps_StageK_GlobalViewportRouteScrollFix_v2.zip`

## Purpose
Remove the large fake camera/scanner frame UI that was causing vertical bloat and clipping pressure across ScanOps module pages.

## Updated files
- `src/components/scanner/ScanPlaceholder.jsx`
- `src/pages/Scan.jsx`

## Changes
- Replaced the large dashed scanner-frame mockup with a compact Scan Product card.
- Removed animated scan-line graphics from the shared scanner placeholder.
- Preserved the `Simulate Scan` test action used across module workflows.
- Preserved route behavior and existing module scan handlers.
- Rebuilt the standalone `/scan` page so it no longer uses the large camera-frame layout.
- Kept scanner controls simple: Torch, Manual, and scan-ready explanation.
- Kept wording broad enough for supermarket workflows: Barcode / PLU / SKU / Shelf Label.

## Expected impact
- Expiry Check, Waste, Markdowns, Stock Count, Receiving, Gap Scan, Replenish, Shelf Tickets, Transfers, and shared scan flows no longer show the large scanner frame.
- Pages should open with useful controls visible sooner.
- Less top clipping and less unnecessary vertical scroll pressure.
- App feels closer to a real handheld scanner workflow where the hardware trigger / scan wedge does the scanning.

## Guardrails preserved
- No launcher changes.
- No routing changes.
- No stock mutation behavior added.
- Stock Count / Full Stocktake governance remains unchanged.
- Test scenario buttons remain available on their existing pages.
- Global viewport/route scroll fix from v2 remains carried forward.

## Validation
- `npm run lint` passed.
- `npm run build` passed.
