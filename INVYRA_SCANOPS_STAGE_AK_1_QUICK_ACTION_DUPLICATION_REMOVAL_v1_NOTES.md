# Invyra ScanOps Stage AK.1 — Quick Action Duplication Removal v1

Baseline: `Invyra_ScanOps_StageAK_HandheldSimplification_AntiOverengineeringGate_v1.zip`

Output: `Invyra_ScanOps_StageAK_1_QuickActionDuplicationRemoval_v1.zip`

## Purpose

Stage AK.1 removes duplicated mini-launcher behavior from handheld content screens. The handheld should have one clear place to start work, while workflow screens should help the operator continue or review their current state.

Locked rule:

```text
One main place to start work.
Workflow screens should help you continue, not relaunch everything.
```

## Implemented change

### Product Lookup quick action cleanup

- Removed the Product Lookup `Quick actions` grid that duplicated core launcher workflows:
  - Count
  - Replenish
  - Markdown
  - Waste
  - Shelf Ticket
- Replaced it with a smaller `My work` summary card.
- The summary uses existing local task and sync state instead of hardcoded workflow launch buttons.
- Kept a single `View My Work` button that routes to the existing Tasks surface.
- Preserved Product Lookup scanning, item summary, price/unit/location display, and attribute guidance.

## Preserved behavior

- Home launcher untouched.
- Keyboard behavior untouched.
- Operational Menu untouched from Stage AK.
- Product Lookup scan/search behavior untouched.
- Receiving untouched.
- Stock Count untouched.
- Replenishment untouched.
- Price Check / Promo Check untouched.
- Shelf Tickets untouched.
- Markdown untouched.
- Waste untouched.
- Transfers untouched.
- No new workflows added.
- No real desktop sync added.
- No inventory, price, promo, waste, print, approval, or accounting mutation added.

## Verification

- `npm run lint` passed.
- `npm run build` passed.

## Changed files

- `src/pages/ProductLookup.jsx`
- `INVYRA_SCANOPS_STAGE_AK_1_QUICK_ACTION_DUPLICATION_REMOVAL_v1_NOTES.md`
