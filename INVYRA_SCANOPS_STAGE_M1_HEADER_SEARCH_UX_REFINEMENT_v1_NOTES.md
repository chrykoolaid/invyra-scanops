# Invyra ScanOps Stage M.1 — Header Search UX Refinement + Workflow Cleanup v1

## Baseline
- Source ZIP: `Invyra_ScanOps_StageM_ScannerFirstWorkflowUIRebuild_v1.zip`

## Home launcher lock
- `src/pages/Home.jsx` was intentionally not changed.
- Home launcher layout, grid, density, and routing remain untouched.

## Scope completed
- Replaced the oversized blue `Scan` button inside workflow header search fields with a lightweight right-side icon affordance.
- Standardized the header placeholder to `Search or scan item`.
- Added magnifying-glass-led search/search-scan field behavior through the shared `WorkflowHeader`.
- Added shared item-entry lookup utilities for barcode, GTIN, PLU, SKU, shelf/location identity, internal ID, and item-name matching.
- Added debounced manual search suggestions.
- Added compact no-results and multiple-results states.
- Added a clear `X` state when text exists.
- Added keyboard-wedge style input capture when the workflow is in item-entry mode and the field is not focused.
- Kept hardware scanner input separate from forced manual focus so the soft keyboard is not programmatically opened by scanner input.
- Compact-ready idle cards reduce repeated scanner-first bloat across workflow pages.
- Transfers now only shows the item-entry search field on the item-selection step.
- Stock Count only shows the item-entry search field once the count session has started.

## Governance preserved
- Transfers remain request-only and continue setting `applies_stock_directly: false`.
- Shelf Tickets remain desktop-request-only and do not claim handheld printing.
- Gap Scan/Replenish create evidence/request/task records only.
- Waste records a scanner event and does not change reorder logic.
- Markdown creates a markdown request/event and shelf-ticket request posture without silent price-file mutation.
- Stock Count records count evidence and does not finalize full stocktake directly.

## Build validation
- `npm ci` completed successfully in the extracted folder.
- `npm run build` completed successfully.
- Vite output note: `[base44] Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)`.

## Manual acceptance checklist
1. Home launcher visually unchanged.
2. Product Lookup, Receiving, Replenish, Gap Scan, Markdowns, Waste, Expiry Check, Shelf Tickets, Transfers item step, and Stock Count scan flow show the magnifying glass search field.
3. Placeholder reads `Search or scan item`.
4. Oversized blue `Scan` button is gone.
5. Manual tap focuses field and opens device keyboard.
6. Typing `greek` shows suggestions after debounce.
7. Clear `X` clears text and suggestions.
8. Exact barcode scan opens item summary immediately.
9. Multiple matches show a result list without blind auto-selection.
10. Unknown scan shows compact no-results state.
11. Workflow task controls appear close to item summary.
12. No horizontal scrolling or footer clipping.
13. Transfers Step 1 has no search field; Transfers item step has search field.
14. Transfer review still states no direct stock mutation.
15. Shelf Tickets sends a desktop request only.
