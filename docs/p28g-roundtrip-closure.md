# P28-G ScanOps Candidate Roundtrip Closure

Phase 28-G adds a ScanOps-side preview manifest that closes the candidate-only handoff loop on paper.

```text
ScanOps queue candidate
→ Inventory inbox candidate
→ Inventory alignment acceptance
→ ScanOps acknowledgement preview
→ Inventory acknowledgement acceptance
```

## Scope

- TEST and TRAINING roundtrip closure preview only.
- LIVE, PRODUCTION, and UNKNOWN are blocked.
- Closure manifest only.
- No transport activation.
- No listener activation.
- No desktop call.
- No event send.
- No inbound persistence.
- No receipt emission.
- No receipt persistence.
- No acknowledgement emission.
- No acknowledgement persistence.
- No Inventory write.
- No stock mutation.
- No workflow mutation.
- No pricing or accounting mutation.
- No purchase order write.
- No forecast write.
- No write attempt.
- No mutation attempt.

This phase does not connect ScanOps to Inventory. It only confirms the candidate roundtrip sequence remains understood by ScanOps after Inventory Phase 28-F.
