# Invyra ScanOps Stage K Viewport Clipping Fix v1

## Purpose
Fix the Stock Count mode selector clipping observed in the handheld/Base44 preview after Stage K.

## Changes
- Locked the Stock Count page to a fixed handheld viewport using `h-dvh` / `max-h-dvh`.
- Changed the Stock Count content area to a true internal scroll region with `min-h-0` and `overscroll-contain`.
- Added larger bottom safe padding so the final mode card and footer actions do not sit under the preview/browser edge.
- Reduced the Stock Count mode selector vertical bloat:
  - Compact intro card.
  - Compact count type cards.
  - Smaller helper text.
  - Tighter governed badges.
- Preserved the Stage K doctrine:
  - Launcher remains `Stock Count`.
  - Stocktake remains inside Stock Count as `Full Stocktake`.
  - Handheld counts do not directly mutate inventory.

## Files updated
- `src/pages/StockCount.jsx`

## Regression guard
- No Stocktake launcher tile added.
- No launcher grid structure changed.
- No broad shell/routing rewrite.
- No horizontal scrolling introduced.
