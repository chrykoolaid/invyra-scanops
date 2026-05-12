# Invyra ScanOps Stage AG — Multi-Device Session Collaboration v1

Baseline: `Invyra_ScanOps_StageAF_DeviceUserShiftGovernance_v1.zip`

Output: `Invyra_ScanOps_StageAG_MultiDeviceSessionCollaboration_v1.zip`

## What changed

- Added a local/demo-safe collaboration layer for shared store-floor work.
- Added Session Collaboration workspace under Operational Menu near Device & Shift Governance.
- Added active demo devices HH-001, HH-002, HH-003, and HH-004 with clear local/demo wording.
- Added collaboration-aware task ownership states: available, claimed, soft locked, takeover requested, taken over, released, conflict review required, conflict resolved, duplicate blocked, and view-only remote owner.
- Added collaboration event model with actor, role, device, session, shift, store/location, permission result, conflict status, and deferred sync status.
- Extended Stage AF governance action keys for collaboration permissions.
- Added local task actions: claim, release own, request takeover, approve takeover, force release, and resolve conflict.
- Added conflict review support for duplicate claims, remote-owner edit attempts, approval/quantity/status mismatch, permission mismatch, shift mismatch, and device mismatch.
- Added lightweight collaboration ownership registration for Replenishment, Shelf Tickets, Markdown Approval, and Waste Review records.

## Safety boundaries preserved

- No Home launcher changes.
- No keyboard changes.
- No Product Lookup redesign.
- No Receiving, Transfers, Stock Count, Replenishment, Price Check, Shelf Ticket, Markdown, Waste, or Governance redesign.
- No real WebSocket/live sync.
- No real cloud multi-device networking.
- No desktop sync transport yet.
- No push notifications.
- No MDM/device fleet control.
- No live stock, price, promotion, write-off, or accounting mutation.
- All collaboration sync wording remains deferred until Stage AH.

## Files added

- `src/lib/scanOpsCollaboration.js`
- `src/pages/SessionCollaboration.jsx`
- `INVYRA_SCANOPS_STAGE_AG_MULTI_DEVICE_SESSION_COLLABORATION_v1_NOTES.md`

## Files updated

- `src/App.jsx`
- `src/components/scanner/OperationalMenuPanel.jsx`
- `src/lib/scanOpsGovernance.js`
- `src/lib/scanOpsEvents.js`
- `src/lib/scanOpsReplenishment.js`
- `src/lib/scanOpsShelfTicketContracts.js`
- `src/lib/scanOpsMarkdownApproval.js`
- `src/lib/scanOpsWasteReview.js`

## Validation

- `npm run build` passed.
- `npm run lint` passed.
