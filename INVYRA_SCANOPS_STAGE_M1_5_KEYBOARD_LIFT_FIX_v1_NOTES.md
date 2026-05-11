# Invyra ScanOps Stage M.1.5 Keyboard Lift Fix v1

## Purpose
Fix the fallback manual-search keyboard after Stage M.1.4 still rendered too low in the Base44/desktop phone preview.

## Changes
- Lifted the fallback keyboard above the lower preview/browser edge.
- Removed bottom-edge dependence from the keyboard by overriding `bottom-0` with a fixed lifted offset.
- Kept lowercase/uppercase toggle behavior.
- Kept 123/ABC mode behavior.
- Kept the keyboard compact.
- Did not restore any Ready-to-scan or idle instructional body cards.
- Did not restore ScanOps floating toast behavior.
- Did not touch the Home launcher.

## Files changed
- `src/index.css`

## Files intentionally not changed
- `src/pages/Home.jsx`
- `src/components/scanner/WorkflowHeader.jsx`
- Navigation/routing
- Backend inventory mutation logic
