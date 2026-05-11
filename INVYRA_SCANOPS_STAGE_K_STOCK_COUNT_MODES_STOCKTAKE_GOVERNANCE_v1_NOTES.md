# Invyra ScanOps Stage K — Stock Count Modes + Stocktake Governance v1

Baseline:
- Invyra_ScanOps_StageJ1_1_LauncherCardAlignmentSizingPolish_v1_FIXED.zip

Scope:
- Keep the main launcher card named Stock Count.
- Treat Stocktake as a formal count type inside the Stock Count workspace.
- Do not add a duplicate Stocktake launcher tile.
- Add Stock Count mode selection and a governed Quick Count workflow.

Updated files:
- src/pages/StockCount.jsx
- src/components/scanner/NumericKeypad.jsx
- src/lib/scanOpsEvents.js

Added files:
- src/lib/scanOpsStockCount.js

What changed:
- Rebuilt Stock Count into a mode-driven workspace.
- Added Stock Count mode selector:
  - Quick Count
  - Cycle Count
  - Gap / Variance Count
  - Department Count
  - Full Stocktake
- Added clear wording that Full Stocktake is a formal scheduled inventory event, not a separate launcher module and not a casual stock-adjustment shortcut.
- Added Quick Count item lookup by barcode, PLU, SKU, or item-name fallback.
- Added PLU proof path using PLU 4011 for loose bananas.
- Added count session model and count line model for scanner-side count capture.
- Added expected quantity, counted quantity, variance preview, optional variance reason, optional note, review screen, and submit screen.
- Added event/audit sync payloads for count session started, line saved, variance review required, and count submitted.
- Variance submissions are explicitly marked as review-required and do not mutate stock directly.
- Added decimal keypad support for weighted products while preserving existing keypad behavior for other modules.

Business rule locked in this pass:
- ScanOps records counted quantities.
- Invyra Inventory reviews/approves variances and owns final stock movement ledger adjustments.
- No handheld count automatically applies a stock adjustment.

Out of scope:
- Full stocktake event scheduler.
- Manager approval engine.
- Final stock adjustment mutation.
- Advanced offline conflict handling.
- Count reporting/exporting.

Acceptance checks:
- Launcher still shows Stock Count only.
- Tapping Stock Count opens the Stock Count workspace.
- Stock Count workspace offers Quick Count, Cycle Count, Gap / Variance Count, Department Count, and Full Stocktake.
- Full Stocktake appears as a formal/governed mode inside Stock Count.
- Quick Count is usable with scan/manual lookup, counted quantity input, variance preview, save, review, and submit.
- Variance counts are marked for review.
- No automatic inventory mutation is performed by the handheld UI.
- Sync/review state is visible.
- No horizontal scrolling was introduced.

Validation:
- npm run lint passed.
- npm run build passed.
