# Invyra ScanOps Stage M.1.6 — Keyboard Higher Lift v1

## Purpose
Move the fallback manual-search keyboard further upward so it does not clip inside the Base44/desktop handheld preview.

## Changed
- Increased the fallback keyboard bottom offset from 3rem to 6.75rem.
- Kept abc / ABC and 123 modes intact.
- Preserved disabled toasts and removed ready-text cleanup from the prior build.
- Home launcher was not touched.

## Files changed
- src/index.css

## Test
1. Open Product Lookup.
2. Tap the search field.
3. Confirm the fallback keyboard floats higher above the bottom edge and all rows are visible.
4. Confirm lowercase/uppercase and number modes still work.
5. Confirm Home remains unchanged.
