# Invyra ScanOps Stage AC — Shelf Ticket Queue v2 + Print-Ready Contracts v1

Baseline: `Invyra_ScanOps_StageAB_PricePromoVerification_v1.zip`

## Implemented

- Rebuilt the existing Shelf Tickets workflow into a queue-first Stage AC surface.
- Imports Stage AB Price Check / Promo Check records where `requestedShelfTicket` or `requested_shelf_ticket` is true.
- Guards against duplicate imports by source event ID.
- Allows manual shelf-ticket request creation by scanning or searching from the Shelf Tickets header.
- Adds queue filters for All, Needs Review, and Ready.
- Adds operational queue states:
  - Draft
  - Needs Review
  - Ready for Print Handoff
  - Printed / Completed
  - Cancelled
- Adds print-ready contract creation with contract version `SCANOPS_SHELF_TICKET_V1`.
- Adds ticket format options:
  - Standard Shelf
  - Promo Label
  - Missing Label
  - Wrong Label
  - Price Review
- Adds a handheld-safe print-ready preview card.
- Adds local queue event records for request import, manual creation, contract creation/update, ready handoff, completion, and cancellation.
- Writes ScanOps events for Stage AC actions with explicit `printer_integration: false` / no print-job claim semantics.

## Hard locks respected

- Home launcher was not touched.
- Keyboard was not touched.
- Stage AA Replenishment was not touched.
- Stage AB Price Check / Promo Check was not redesigned.
- Stage Z Reporting was not touched.
- Product price records are not mutated.
- Promotion records are not mutated.
- No real printer routing was added.
- No browser print or `window.print` was added.
- No printer registry/status/retry/agent work was added.
- Markdown Approval and Waste Review were not added.
- No toast spam added.

## Files changed

- `src/pages/ShelfTickets.jsx`
- `src/lib/scanOpsShelfTicketContracts.js`
- `src/lib/scanOpsEvents.js`
- `INVYRA_SCANOPS_STAGE_AC_SHELF_TICKET_QUEUE_PRINT_CONTRACTS_v1_NOTES.md`

## Testing focus

1. Home launcher unchanged.
2. Keyboard unchanged.
3. Stage AA Replenishment still opens and works.
4. Stage AB Price Check still opens and can save Ticket Needed evidence.
5. Stage Z Reporting still opens.
6. Shelf Tickets opens as queue-first workflow.
7. Stage AB Ticket Needed event imports once.
8. Reopening / refreshing Shelf Tickets does not duplicate imported AB tickets.
9. Manual scan/search inside Shelf Tickets creates a Draft ticket request.
10. Queue filters work for All / Needs Review / Ready.
11. Selecting a ticket shows compact item/source/status details.
12. Ticket format selection updates preview.
13. Save Contract creates a local print-ready contract.
14. Ready for Handoff changes status after a contract exists.
15. Mark Completed is manual only and does not imply real printing.
16. Cancel Ticket removes the request from active queue views but preserves local event history.
17. No price/promo mutation.
18. No printer integration.
19. No horizontal clipping.
20. No large text walls.
