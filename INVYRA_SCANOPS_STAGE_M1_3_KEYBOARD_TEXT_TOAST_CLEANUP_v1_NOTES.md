# Invyra ScanOps Stage M.1.3

## Keyboard containment cleanup

- Bottom fallback keyboard was compressed so the full keyboard fits inside the handheld preview.
- Letter rows, number row, and action row use smaller key heights and tighter spacing.
- The fallback keyboard remains bottom anchored.
- abc / ABC toggle remains supported.
- Scanner-wedge input still does not open the fallback keyboard.

## Text cleanup

- Removed the Receiving idle instruction card: "Scan the first item after supplier setup."
- Removed the Stock Count mode explanation block under the count mode dropdown.
- Existing idle ReadyCard component remains null so the large "Ready to scan" body cards do not render.
- Transfers no longer shows the extra "No item selected yet" card on the quantity step.

## Toast cleanup

- Removed the app-level toast renderer from ScanOps.
- Replaced the toast provider output with a no-op renderer.
- Changed ScanOps toast hook to a no-op so task reset / coming-soon / sync demo actions do not display floating toast boxes.
- Inactive action tiles now do nothing instead of showing a toast.

## Guardrails

- Home launcher was not changed.
- Navigation model was not changed.
- Backend mutation governance was not changed.
