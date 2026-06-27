# P28-C ScanOps ↔ Inventory Candidate Alignment

Phase 28-C adds a ScanOps-side alignment manifest for the candidate-only bridge path now present on both sides.

```text
ScanOps local queue candidate
→ Inventory inbox candidate
→ Inventory validation candidate
→ Inventory receipt candidate
→ ScanOps receipt candidate preview
```

## Scope

- TEST and TRAINING candidate alignment only.
- LIVE, PRODUCTION, and UNKNOWN are blocked.
- Alignment manifest only.
- Read-only preview only.
- No transport activation.
- No listener activation.
- No desktop call.
- No event send.
- No inbound persistence.
- No receipt emission.
- No receipt persistence.
- No Inventory write.
- No stock mutation.
- No workflow mutation.
- No pricing or accounting mutation.
- No purchase order write.
- No forecast write.
- No write attempt.
- No mutation attempt.

This phase does not connect ScanOps to Inventory. It only confirms the intended candidate handoff sequence introduced by ScanOps Phase 28-A and Inventory Phase 28-B.
