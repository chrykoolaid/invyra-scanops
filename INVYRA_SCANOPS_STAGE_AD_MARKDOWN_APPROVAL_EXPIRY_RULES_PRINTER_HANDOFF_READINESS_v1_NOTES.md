# Invyra ScanOps Stage AD — Markdown Approval + Expiry Rules + Printer Handoff Readiness v1

Baseline: `Invyra_ScanOps_StageAC_ShelfTicketQueue_PrintContracts_v1.zip`

## Scope completed

- Rebuilt `src/pages/Markdowns.jsx` from the older simple markdown batch surface into an approval-led handheld queue/workspace.
- Added scan/search item entry, quantity, expiry date, batch/lot, reason, selected markdown percent, label-needed choice, and print handoff method selection.
- Added expiry-driven markdown rule evaluation:
  - expired stock is blocked into `Blocked - Waste Review Required` and cannot be approved as a markdown;
  - expires-today / short-dated items require approval and show suggested markdown ranges;
  - higher-risk or manager-instruction requests move into review state.
- Added role-aware approval behavior:
  - Staff can create and submit requests;
  - Supervisor, Manager, and Admin can approve / return / reject eligible requests;
  - approval updates are state-only and never mutate product prices.
- Added approved markdown label handoff:
  - approved markdowns can be marked ready for label handoff;
  - duplicate handoff is blocked once linked contracts exist;
  - product master price and POS price remain unchanged.
- Added shelf-ticket-compatible markdown label contracts:
  - Stage AD creates a Shelf Ticket Queue request with source `MARKDOWN_LABEL`;
  - Stage AD creates a `MARKDOWN_LABEL` print-ready shelf-ticket contract;
  - Shelf Tickets can now display markdown label requests with a markdown label template.
- Added printer handoff placeholder contract:
  - contract version `SCANOPS_PRINTER_HANDOFF_V0`;
  - status `READY_FOR_HANDOFF`;
  - `hardwareConnectionImplemented: false`;
  - `printerStatus: NOT_CONNECTED_STAGE_DEFERRED`;
  - printer connection is shown as deferred in UI.

## Files updated / added

- Added `src/lib/scanOpsMarkdownApproval.js`
- Updated `src/pages/Markdowns.jsx`
- Updated `src/lib/scanOpsShelfTicketContracts.js`
- Updated `src/lib/scanOpsEvents.js`
- Added this notes file

## Hard locks preserved

- Home launcher untouched.
- Keyboard / header search untouched.
- Stage AA Replenishment untouched.
- Stage AB Price Check / Promo Check untouched.
- Stage AC Shelf Ticket Queue contracts preserved and extended only for markdown label source/template support.
- Stage Z Reporting untouched.
- No direct product price mutation.
- No POS price mutation.
- No promotion mutation.
- No real Bluetooth pairing.
- No real Wi-Fi discovery.
- No printer driver logic.
- No browser print or `window.print`.
- No printer status polling.
- No real print retry queue.
- Waste Review itself is not built yet; expired markdowns are only blocked for future Waste Review.

## Validation performed

- `npm run lint` passed.
- `npm run build` passed.

## Manual test checklist

1. Open Markdowns.
2. Confirm Home launcher and other workflows are unchanged.
3. Scan/search a normal short-dated item.
4. Confirm request form shows quantity, expiry date, batch/lot, reason, markdown percent, rule summary, label needed, and print handoff methods.
5. Create request.
6. Submit approval as Staff.
7. Switch role preview to Supervisor / Manager / Admin.
8. Approve the request.
9. Click Ready for Label Handoff.
10. Confirm the selected markdown shows linked Shelf Ticket, Print Contract, and Printer Contract IDs.
11. Confirm the UI says printer connection deferred.
12. Open Shelf Tickets and confirm a Markdown Label request appears with a markdown label contract path.
13. Try Ready for Label Handoff again and confirm duplicate handoff is blocked.
14. Create an expired markdown request and confirm it blocks as Waste Review Required.
15. Confirm no product price, promotion, POS, Bluetooth, Wi-Fi, browser print, or printer polling behavior is introduced.
