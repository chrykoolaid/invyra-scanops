# Invyra ScanOps Stage AL — Workflow Friction Reduction v1

Baseline: `Invyra_ScanOps_StageAK_1_QuickActionDuplicationRemoval_v1.zip`

Output: `Invyra_ScanOps_StageAL_WorkflowFrictionReduction_v1.zip`

## Purpose

Stage AL is a narrow friction-reduction pass after Stage AK / AK.1. It does not add new workflow tiles, dashboards, backend behavior, filters, printer routing, sync transport, approval execution, or inventory/price/accounting mutation.

The pass focuses on reducing operator hesitation:

1. scan/search,
2. see item or batch context,
3. take one clear current-workflow action,
4. save local evidence where appropriate,
5. move on.

## Screens inspected

- Product Lookup
- Receiving
- Stock Count
- Replenishment
- Price Check
- Shelf Tickets
- Markdowns
- Waste Review
- Transfers
- Operational menu About panel

## Changes made

### Product Lookup

- Removed the leftover `View My Work` cross-workflow navigation button from the lookup result surface.
- Kept Product Lookup as a lookup/status surface rather than a launcher-style workflow menu.
- Shortened the work-status helper line to avoid telling operators to jump into other workflows from Product Lookup.

### Replenishment

- Replaced operator-facing stage wording with plain workflow wording.
- Shortened shelf/backroom helper copy.
- Shortened saved-result wording.
- Kept the existing scan/search, quantity, reason, outcome, and submit path intact.

### Price Check

- Replaced operator-facing stage wording with plain workflow wording.
- Shortened the opening helper line and system-price helper.
- Shortened the Ticket Needed explanation.
- Preserved the price/promo verification flow and local-only safety truth.

### Markdowns

- Removed duplicate bottom action behavior for selected markdown requests.
- Selected markdown requests now rely on their inline approval and label handoff controls instead of repeating `Submit Approval` / `Ready Handoff` in the sticky action bar.
- The sticky action bar remains only while creating a new scanned markdown request, where it provides the current-workflow `Create Request` action.
- Shortened markdown request and printer handoff helper text.

### Shelf Tickets

- Removed duplicate bottom `Save Contract` sticky action because the selected-ticket action card already contains `Save Contract`.
- Shortened the queue helper text and manual completion helper.
- Preserved contract save, ready-for-handoff, completion, cancellation, preview, and print-safe wording.

### Waste Review

- Shortened several long helper lines while keeping the critical truth that handheld review does not mutate live inventory, prices, promotions, or accounting.
- Preserved review queue, draft creation, submission, approval, return, reject, and adjustment-contract behavior.

### Receiving / Stock Count / Transfers

- Shortened idle/read-only/done helper text where it created extra reading load.
- Preserved batch/session creation, evidence capture, submit, review, and exception behavior.

### Operational menu

- Updated the About panel stage label to Stage AL.

## Explicit non-changes

- Home launcher was not redesigned.
- Keyboard behavior, keyboard position, caps/small-letter handling, and accepted Stage M1.7 sizing were not changed.
- No workflow tiles were added.
- No dashboards were added.
- No new filter panels were added.
- No backend sync, printer routing, approval execution, inventory mutation, price mutation, promo mutation, or accounting mutation was added.
- No toast behavior was introduced.
- No layout shell rewrite was performed.

## Validation

- `npm run lint` passed.
- `npm run build` passed.

Build note: dependencies were installed with `npm ci` for local validation only. `node_modules` and generated `dist` output are excluded from the delivered source zip.
