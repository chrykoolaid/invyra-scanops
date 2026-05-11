# Invyra ScanOps Stage K — Global Viewport Clipping Fix v1

## Purpose
Fix clipping across the entire ScanOps handheld app, not only the Stock Count screen.

## Root cause
Most pages used `min-h-screen`, which allowed the app page to grow against the browser/Base44 preview canvas. Tall flows could push content under the preview edge and create outer-page scrolling instead of safe internal app scrolling.

## Fix
Updated the global app stylesheet so every handheld page:

- uses a fixed `100dvh` app viewport
- prevents browser/body overflow
- keeps headers fixed in the page flow
- forces each direct page `<main>` workspace to become the internal vertical scroll area
- blocks horizontal overflow globally for page workspaces
- preserves smooth mobile-style scrolling

## Files updated
- `src/index.css`

## Scope
This is a global shell/viewport stabilization pass only.

It does not change business workflows, routing, launcher cards, Stock Count doctrine, Stocktake governance, event logic, or Inventory sync behavior.

## Expected result
The following screens should now scroll inside the handheld app instead of clipping against the preview edge:

- Home launcher
- Product Lookup / Scan
- Stock Count
- Receiving
- Replenish
- Gap Scan
- Tasks
- Markdowns
- Waste
- Expiry Check
- Shelf Tickets
- Transfers
- Inventory Sync
- Operational menu surfaces

## Acceptance checks
1. No page should require the outer browser/Base44 canvas scrollbar to reach app content.
2. The app header should remain visible at the top of each module.
3. Tall module content should scroll inside the handheld app frame.
4. No horizontal scrolling should appear.
5. Stock Count / Full Stocktake visibility from the previous clipping fix remains intact.
