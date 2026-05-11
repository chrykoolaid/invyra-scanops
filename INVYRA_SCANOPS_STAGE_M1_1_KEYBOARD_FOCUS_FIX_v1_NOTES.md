# Invyra ScanOps Stage M.1.1 Keyboard Focus Fix v1

Baseline:
- Invyra_ScanOps_StageM1_HeaderSearchUXRefinement_WorkflowCleanup_v1.zip

Purpose:
- Fix the reported issue where the search field can focus in desktop/browser preview but no soft keyboard is visible.
- Preserve the Stage M.1 scanner/search direction and home launcher lock.

Changed:
- `src/components/scanner/WorkflowHeader.jsx`

Behavior:
- Manual tap/click on the search field now explicitly focuses the real input.
- The component attempts to invoke the browser VirtualKeyboard API when available.
- If no native keyboard is detected after manual focus, a compact in-app keyboard fallback appears under the search header.
- The fallback keyboard is manual-search-only and does not appear for scanner-wedge input.
- Scanner input still uses the shared search path without forcing a keyboard.

Home launcher:
- Not touched.

Validation:
- `npm ci`
- `npm run build`
