# Invyra ScanOps Stage M.1.2
# Bottom Keyboard Placement + Ready Text Cleanup v1

Baseline:
- Invyra_ScanOps_StageM1_1_KeyboardFocusFix_v1.zip

Scope completed:
- Moved the browser-preview fallback keyboard from directly under the header to a fixed bottom keyboard panel.
- Added a caps/lowercase toggle to the fallback keyboard.
- Kept native mobile keyboard behavior best-effort via focus and VirtualKeyboard API where available.
- Preserved scanner-wedge behavior so scanner input does not force the keyboard fallback open.
- Removed large visible Ready to scan explainer cards by making the shared ReadyCard render nothing.
- Left the home launcher untouched.

Files changed:
- src/components/scanner/WorkflowHeader.jsx
- src/components/scanner/WorkflowPrimitives.jsx
- src/index.css

Files intentionally not changed:
- src/pages/Home.jsx
- Navigation/routing model
- Backend inventory mutation logic
- Printer or desktop inventory engine files

Validation:
- npm ci
- npm run build

Manual test focus:
1. Open Product Lookup.
2. Tap the search field.
3. Confirm fallback keyboard appears at the bottom of the handheld viewport in browser preview.
4. Tap abc / ABC and confirm keys switch lower/upper case and enter matching letters.
5. Confirm the Ready to scan card no longer appears in the body.
6. Confirm scanner/physical keyboard input still resolves through the shared search path without opening the fallback keyboard when the field is not manually focused.
