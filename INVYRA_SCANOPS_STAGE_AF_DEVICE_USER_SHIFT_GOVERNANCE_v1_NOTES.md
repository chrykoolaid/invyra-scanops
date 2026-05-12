# Invyra ScanOps Stage AF — Device / User / Shift Governance v1

Baseline used:

```text
Invyra_ScanOps_StageAE_WasteReview_ShrinkGovernance_v1.zip
```

Output build:

```text
Invyra_ScanOps_StageAF_DeviceUserShiftGovernance_v1.zip
```

## Purpose

Stage AF adds the local/demo-safe trust layer for ScanOps before multi-device collaboration, desktop sync contracts, and pilot-readiness stages. It makes governed workflow actions carry device, user, role, session, shift, store/location, permission, and sync-deferred context without building real authentication, SSO, MDM, payroll, biometrics, remote wipe, desktop sync, or live collaboration.

## Implemented

- Added shared governance context model for:
  - device ID / label
  - user ID / name / role
  - session ID / status
  - shift ID / label / status
  - store / location context
  - local network and sync-deferred posture
- Added governance event model for allowed and blocked action evidence.
- Added reusable permission helper:

```js
canPerformScanOpsAction(actionKey, governanceContext)
```

- Added governed action keys for:
  - markdown submit / approve / reject
  - waste submit
  - waste approval
  - shrink / high-risk approval
  - adjustment contract creation
  - shelf-ticket print handoff
  - price-check override
  - shift start / shift end
  - device context view
  - demo role switch
- Added Device & Shift Governance workspace reachable from the Operational Menu.
- Added Current Session, Shift Controls, Device Status, Permission Preview, and Recent Governance Events sections.
- Added Start Shift / End Shift controls.
- Added Admin-only local/demo governance reset.
- Added compact governance strip to governed Markdown and Waste Review screens.
- Enriched Markdown approval records, handoffs, and printer handoff contracts with governance fields where safe.
- Enriched Waste Review records, decisions, and adjustment contracts with actor, role, device, session, shift, store/location, and sync-deferred context.
- Enriched Shelf Ticket queue / print handoff contracts with shift/device governance context where safe.
- Updated global event identity to include shift/device labels and sync status.
- Updated App Header metadata to show current user, role, shift, and device.

## Hard locks respected

- Home launcher layout was not modified.
- Keyboard behavior was not modified.
- Product Lookup, Receiving, Transfers, Stock Count, Replenishment, Price Check, Shelf Tickets, Markdown, and Waste layouts were not redesigned.
- Only minimal governance metadata, route, and permission checks were added.
- No live inventory mutation was added.
- No product price mutation was added.
- No promotion mutation was added.
- No accounting/write-off mutation was added.
- No real printer pairing was added.
- No real authentication, SSO, MDM, biometrics, remote wipe, payroll, desktop sync, or multi-device collaboration was added.

## Files added

```text
src/lib/scanOpsGovernance.js
src/components/scanner/GovernanceContextStrip.jsx
src/pages/DeviceGovernance.jsx
INVYRA_SCANOPS_STAGE_AF_DEVICE_USER_SHIFT_GOVERNANCE_v1_NOTES.md
```

## Files updated

```text
src/App.jsx
src/components/scanner/AppHeader.jsx
src/components/scanner/OperationalMenuPanel.jsx
src/lib/scanOpsSession.js
src/lib/scanOpsEvents.js
src/lib/scanOpsMarkdownApproval.js
src/lib/scanOpsWasteReview.js
src/lib/scanOpsShelfTicketContracts.js
src/pages/Markdowns.jsx
src/pages/Waste.jsx
```

## Validation

```text
npm ci
npm run build
npm run lint -- --quiet
```

Result:

```text
Build passed.
Lint passed.
```

Note: initial build check failed before installing dependencies because this uploaded source ZIP did not include node_modules and Vite was not locally available. After npm ci, build and lint passed.

## Suggested test checklist

```text
1. Home launcher unchanged.
2. Keyboard behavior unchanged.
3. Operational Menu opens.
4. Device & Shift Governance opens from Operational Menu.
5. Current user, role, device, session, store/location, and shift are visible.
6. Start Shift works after ending a shift.
7. End Shift blocks governed submissions until shift is started again.
8. Permission Preview updates by current role and shift state.
9. Staff can save/submit allowed waste/markdown records when shift is active.
10. Staff cannot approve restricted markdown/waste/shrink actions.
11. Supervisor can approve supervisor-level records.
12. Manager can approve high-risk/shrink and create adjustment contracts.
13. Admin can reset local/demo governance state.
14. Markdown events include actor, role, device, session, and shift context.
15. Waste events include actor, role, device, session, and shift context.
16. Adjustment contracts include actor, role, device, session, and shift context.
17. Shelf-ticket handoff contracts include shift/device context where safe.
18. Blocked actions produce calm inline messages and governance events.
19. UI still says sync deferred where appropriate.
20. No live inventory, price, promotion, or accounting mutation occurs.
```

## Git commit commands

PowerShell-safe:

```powershell
git add src/App.jsx src/components/scanner/AppHeader.jsx src/components/scanner/OperationalMenuPanel.jsx src/components/scanner/GovernanceContextStrip.jsx src/lib/scanOpsSession.js src/lib/scanOpsEvents.js src/lib/scanOpsGovernance.js src/lib/scanOpsMarkdownApproval.js src/lib/scanOpsWasteReview.js src/lib/scanOpsShelfTicketContracts.js src/pages/DeviceGovernance.jsx src/pages/Markdowns.jsx src/pages/Waste.jsx INVYRA_SCANOPS_STAGE_AF_DEVICE_USER_SHIFT_GOVERNANCE_v1_NOTES.md
git commit -m "Add ScanOps Stage AF device user shift governance"
```
