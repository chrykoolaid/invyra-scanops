# P30-C ScanOps Runtime Config Contract

Phase 30-C adds the ScanOps-side runtime configuration contract shape.

This phase does not save configuration, load persisted configuration, pair devices, validate endpoints, open transport, or start runtime behavior.

## Scope

- TEST and TRAINING config contract only.
- LIVE, PRODUCTION, and UNKNOWN are blocked.
- Inactive contract only.
- Hard-disabled operations.
- No config persistence.
- No persisted config loading.
- No pairing token generation.
- No endpoint validation.
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

## Future config shape

The future runtime configuration may include candidate-only fields for:

```text
environment
device id
session id
Inventory endpoint candidate
pairing token candidate
offline queue policy candidate
retry policy candidate
```

## Disabled config operations

```text
save config = false
load persisted config = false
pair device = false
validate endpoint live = false
open transport = false
start runtime = false
```

This phase only defines the shape of the future config contract. It does not create a settings screen, local storage, pairing flow, or transport behavior.
