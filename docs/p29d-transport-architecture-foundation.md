# P29-D ScanOps Transport Architecture Foundation

Phase 29-D accelerates the bridge work by bundling the next transport architecture planning items into one milestone.

This phase is still design-only. It does not activate transport or runtime bridge behavior.

## Included architecture areas

- Local IP / Wi-Fi pairing model.
- Handheld-to-desktop network shape.
- Device identity model.
- Session lifecycle.
- Offline queue contract.
- Retry strategy.
- Handoff envelope schema.
- Error taxonomy.
- Security boundaries.
- TEST/TRAINING validation rules.

## Pairing model

The future pairing model may support:

- Desktop-generated pairing details.
- Scanner entry of pairing details.
- QR-based pairing later.
- Manual pairing fallback later.

This phase does not open a connection and does not call Inventory Desktop.

## Device identity

Future device identity should include:

- Device ID.
- Device label.
- Environment.
- Operator context.
- Session ID.

This phase does not register or persist devices.

## Session lifecycle

Future session states should be designed around:

```text
Draft
Paired candidate
Ready candidate
Closed candidate
Blocked
```

This phase does not create active sessions.

## Offline and retry contract

The design should require:

- Deterministic ordering.
- Duplicate candidate protection.
- Retry limits.
- Backoff behavior.
- Clear failure states.

This phase does not persist queues and does not replay events.

## Guardrails

- TEST and TRAINING design only.
- LIVE, PRODUCTION, and UNKNOWN blocked.
- No transport activation.
- No listener activation.
- No network call.
- No desktop call.
- No event send.
- No queue persistence.
- No inbound persistence.
- No receipt emission.
- No receipt persistence.
- No acknowledgement emission.
- No acknowledgement persistence.
- No Inventory write.
- No ScanOps write.
- No stock mutation.
- No workflow mutation.
- No pricing or accounting mutation.
- No purchase order write.
- No forecast write.
- No runtime activation.
- No write attempt.
- No mutation attempt.
