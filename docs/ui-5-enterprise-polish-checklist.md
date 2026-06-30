# ScanOps UI-5.7 Enterprise Polish Checklist

## Purpose

This checklist closes the UI-5 Enterprise Device Experience program.

The goal is to keep ScanOps feeling like a purpose-built handheld operating system for inventory work, not a small desktop application.

## Scope

UI-5.x focuses on device confidence and operational clarity:

- Sync and Connectivity
- Device Health
- Offline Experience
- Recovery Guidance
- Session Awareness
- Printer Experience
- Enterprise Polish

## Enterprise polish rules

Every ScanOps screen should remain:

- Scan-first where operational
- Read-only where informational
- Low cognitive load
- Large touch target friendly
- Clear about the current context
- Clear about the next action
- Safe under offline or degraded conditions
- Consistent with Inventory Desktop as system of record

## Shared interaction standards

### Headers

Each page should clearly answer:

1. What is this screen?
2. Where am I?
3. What should I do next?

### Status cards

Status areas should use plain language:

- Healthy
- Warning
- Action Needed
- Offline
- Pending
- Ready

Avoid vague technical labels for frontline users.

### Empty states

Empty states must not be dead ends.

They should explain:

- What is missing
- Why it is missing
- What the operator should do next

### Error and recovery states

Errors should show recommended recovery steps instead of only saying something failed.

Preferred pattern:

- What happened
- What it means
- What to check
- What action to take

### Informational pages

Informational pages must stay read-only.

This applies to:

- Reporting
- Movements
- Device Health
- Recovery Guidance
- Session Awareness
- Printer Experience

## Guardrails

UI polish must not change:

- Inventory bridge contracts
- Sync transport contracts
- Inventory Desktop ownership
- Ledger behavior
- Audit behavior
- Stock posting
- Price mutation
- User permissions
- Wi-Fi joining/password management

## UI-5.x completion checklist

- [ ] Sync and Connectivity dashboard reviewed
- [ ] Device Health reviewed
- [ ] Offline banner reviewed
- [ ] Recovery Guidance reviewed
- [ ] Session Awareness reviewed
- [ ] Printer Experience reviewed
- [ ] Routes open correctly
- [ ] Local build passes
- [ ] No direct inventory writes added
- [ ] No bridge contract changes added
- [ ] No ledger/audit changes added

## Recommended local verification

```bash
git checkout main
git pull
npm install
npm run build
```

Manual smoke-test routes:

```text
/sync-handoff
/device-health
/recovery-guidance
/session-awareness
/printer-experience
```

## Lock recommendation

After this checklist is reviewed and the UI-5.x PRs are merged, lock:

```text
UI-5 Enterprise Device Experience — Complete
```

Future work should then move to actual bridge integration, sync reliability, or production deployment readiness rather than more UI restructuring.
