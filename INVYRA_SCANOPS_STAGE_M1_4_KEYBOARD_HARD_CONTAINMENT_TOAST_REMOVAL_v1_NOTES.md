# Invyra ScanOps Stage M.1.4
## Keyboard Hard Containment + Text/Toast Removal v1

Baseline: Stage M.1.3 keyboard/text/toast cleanup build.

Changes:
- Rebuilt fallback manual keyboard into a compact bottom keyboard so all rows fit in the Base44/desktop preview viewport.
- Preserved lowercase/uppercase toggle with abc/ABC.
- Added a 123/ABC keyboard mode so numeric PLU/SKU/barcode entry remains available without a tall clipped keyboard.
- Reduced keyboard row height, gaps, and bottom safe-area padding.
- Removed Stock Count select helper text from option rendering to avoid large Quick Count explanation blocks.
- Removed direct toast calls from Tasks and Inventory Sync in addition to the existing no-op toast provider.
- Home launcher was not touched.

Validation:
- npm run build passed locally.
