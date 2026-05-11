# Invyra ScanOps Stage M.1.7 Keyboard Button Size Polish v1

## Baseline
Invyra_ScanOps_StageM1_6_KeyboardHigherLift_v1.zip

## Scope
Small keyboard density polish only. Preserve the lifted keyboard position, disabled toasts, removed ready-scan cards, and locked Home launcher.

## Changes
- Increased fallback keyboard key height.
- Increased bottom action key height.
- Increased row and key spacing from ultra-tight gap to a calmer gap.
- Increased keyboard max-height so larger keys are not clipped.
- Preserved abc / ABC and 123 modes.
- Preserved existing upward keyboard lift.

## Files changed
- src/components/scanner/WorkflowHeader.jsx
- src/index.css

## Files intentionally not changed
- src/pages/Home.jsx
- Navigation/routing model
- Backend mutation logic
- Toast removal behavior
- Workflow cards/text cleanup beyond the keyboard sizing issue

## Acceptance
- Manual keyboard remains visible above the bottom preview edge.
- Keys are slightly larger and less cramped.
- abc / ABC toggle still works.
- 123 / ABC mode still works.
- Home launcher remains unchanged.
