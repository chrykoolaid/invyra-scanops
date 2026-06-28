# P30-E ScanOps Device Session Contract

Phase 30-E adds the ScanOps-side device identity and session contract shape.

This phase does not register devices, persist devices, start sessions, persist sessions, pair devices, open transport, or send events.

## Scope

- TEST and TRAINING device/session contract only.
- LIVE, PRODUCTION, and UNKNOWN are blocked.
- Inactive contract only.
- Hard-disabled operations.
- No device registration.
- No device persistence.
- No session start.
- No session persistence.
- No pairing activation.
- No transport activation.
- No listener activation.
- No network call.
- No desktop call.
- No event send.
- No outbound queue persistence.
- No receipt emission.
- No receipt persistence.
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

## Future device identity shape

```text
device id
device label
device role candidate
environment
operator context
```

## Future session shape

```text
session id
device id reference
operator context
started at candidate
ended at candidate
```

This phase only defines candidate shape. It does not create device records, session records, pairing flows, local storage, or runtime bridge behavior.
