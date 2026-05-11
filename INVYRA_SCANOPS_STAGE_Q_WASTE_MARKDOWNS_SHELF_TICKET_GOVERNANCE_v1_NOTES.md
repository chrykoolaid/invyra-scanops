# Invyra ScanOps Stage Q — Waste / Markdowns / Shelf Ticket Governance v1

Baseline: `Invyra_ScanOps_StageP_ReceivingTransfersBackendLifecycle_v1.zip`

## Scope delivered

Stage Q converts Waste, Markdowns, and Shelf Tickets into governed request/evidence workflows:

- Waste now creates waste evidence requests only.
- Markdowns now create markdown price-change requests only.
- Shelf Tickets now create ticket request batches only.
- Inventory desktop remains the owner for stock posting, price activation, approval, printer routing, and print confirmation.

## Files updated

- `src/pages/Waste.jsx`
- `src/pages/Markdowns.jsx`
- `src/pages/ShelfTickets.jsx`
- `src/lib/scanOpsRequestLifecycle.js`

## Waste changes

- Adds controlled scan/search item flow.
- Adds quantity stepper.
- Adds explicit waste reason, condition, disposal action, and notes.
- Adds draft batch list.
- Adds review screen before submit.
- Adds submitted state card.
- Duplicate same item/reason/condition/action lines merge and increment quantity.
- Submit creates a waste request/evidence record in local lifecycle storage.
- Submit does not reduce SOH.

## Markdown changes

- Adds markdown reason.
- Adds markdown type:
  - Fixed new price
  - Percentage discount
  - Amount off
  - Clearance ticket only
  - Manager review only
- Captures current price snapshot.
- Captures requested price/discount/amount snapshot.
- Captures ticket-required yes/no.
- Adds review screen before submit.
- Adds submitted state card.
- Duplicate same item/reason/type/ticket-required lines merge/update.
- Submit creates a markdown request record in local lifecycle storage.
- Submit does not change item price.
- Ticket-required markdowns record linked ticket intent only; no print is claimed.

## Shelf Ticket changes

- Adds ticket type, paper size, copies, reason, and notes.
- Adds review screen before submit.
- Adds submitted state card.
- Duplicate same item/type/size/reason lines increment copies.
- Submit creates a shelf ticket request record in local lifecycle storage.
- Submit does not print.

## Backend / lifecycle additions

Added option constants and local request builders/savers for:

- Waste requests
- Markdown requests
- Shelf ticket requests

Added draft persistence helpers for the three Stage Q workflows so leaving/re-entering the workflow does not silently wipe draft batches unless the user clears/submits.

## Guardrails preserved

- Home launcher untouched.
- Keyboard untouched.
- Stage N compact result card pattern preserved.
- Stage O Stock Count untouched.
- Stage P Receiving and Transfers untouched.
- No toasts added.
- No direct stock mutation.
- No direct price mutation.
- No direct printer integration.
- No Ready-to-scan text walls added.

## Validation performed

- `npm ci` completed.
- `npm run build` completed.
- `npm run lint` completed.

## Suggested focused test

1. Home screen unchanged.
2. Keyboard unchanged.
3. Stock Count still opens and existing count flow still works.
4. Receiving still opens and existing batch/review/submit flow still works.
5. Transfers still remains step-based.
6. Waste: scan item, add quantity/reason/condition/action, review, submit.
7. Confirm Waste submitted card says no stock adjusted.
8. Markdown: scan item, choose reason/type, enter requested price/discount, review, submit.
9. Confirm Markdown submitted card says no price changed and no ticket printed.
10. Shelf Tickets: scan item, choose type/size/copies/reason, review, submit.
11. Confirm Shelf Ticket submitted card says no ticket printed.
12. Duplicate same Waste line merges quantity.
13. Duplicate same Shelf Ticket line increments copies.
14. No toasts appear.
15. No horizontal clipping.
