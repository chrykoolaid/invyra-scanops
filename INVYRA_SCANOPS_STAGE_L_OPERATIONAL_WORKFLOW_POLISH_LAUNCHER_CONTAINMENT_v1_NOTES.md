# Invyra ScanOps Stage L — Operational Workflow Polish + Launcher Grid Containment v1

Baseline: `Invyra_ScanOps_StageK1_RemoveScannerFramesCompactScanEntry_v1.zip`

## Completed scope

- Tightened the home launcher 3-column grid so all launcher rows are reachable inside the handheld app viewport.
- Reduced launcher card height, icon block size, label spacing, and row gap while preserving touch-friendly cards.
- Standardized the shared compact `Scan / Enter Item` card across scan-based workflows.
- Added a reusable touch-friendly select control for ScanOps setup dropdowns.
- Converted Receiving into a compact supplier + delivery reference + scan + quantity/condition flow.
- Compressed Shelf Tickets into ticket type select, ticket reason select, scan card, current batch, and Send to Desktop.
- Rebuilt Transfers as a true step workflow:
  1. Transfer Type
  2. Source Location
  3. Scan / Enter Item
  4. Quantity / Weight
  5. Destination Location
  6. Review and Confirm
- Preserved the transfer rule that handheld Transfers create stock movement requests only and do not directly mutate stock.
- Collapsed Gap Scan and Expiry Check test scenarios behind a small Show test scenarios button.
- Added sticky in-app action areas for longer operational workflows.
- Preserved current module order, routing, Stock Count governance, simulated scan testing, and no-real-printing shelf ticket posture.

## Files changed

- `src/components/scanner/ActionTile.jsx`
- `src/components/scanner/ScanPlaceholder.jsx`
- `src/components/scanner/TouchSelect.jsx`
- `src/index.css`
- `src/pages/Home.jsx`
- `src/pages/Receiving.jsx`
- `src/pages/ShelfTickets.jsx`
- `src/pages/Transfers.jsx`
- `src/pages/GapScan.jsx`
- `src/pages/ExpiryCheck.jsx`

## Verification

- `npm run build` completed successfully.
- Vite/Base44 warning observed: `Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)`. This is expected in local build mode and did not fail the build.

## Out of scope preserved

- No real backend sync engine.
- No direct inventory mutation.
- No printer infrastructure.
- No real scanner/camera integration.
- No stocktake governance rewrite.
