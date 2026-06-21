# Phase 1H-D Bridge Security Review

Status: review only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Purpose

Phase 1H-D reviews security expectations for the future ScanOps <-> Inventory Bridge from the ScanOps side.

This is documentation only. It does not implement runtime bridge code, transport, sync, replay, outbox processing, local persistence writes, Inventory writes, or operational mutation.

## Security boundary overview

ScanOps must treat future bridge submission as evidence submission only.

ScanOps must not assume local readiness equals Inventory trust. Inventory owns the final trust decision and receipt classification.

## Security principles

1. Default disabled.
2. Inventory owns final permission.
3. ScanOps must not self-authorize Inventory trust.
4. No trust based on LAN presence alone.
5. No trust based on IP address alone.
6. Stable event identity required.
7. Stable idempotency key required.
8. Payload hash required.
9. Payload signature required in a future implementation.
10. Retry must preserve event identity.
11. Receipt matching required.
12. Receipt mismatch requires operator action.
13. Accepted-to-ledger is not proof of operational Inventory mutation.
14. ScanOps must preserve evidence without claiming Inventory changes.

## Future ScanOps security checks

A future ScanOps local guard should verify:

```text
local_feature_flag_state
local_stop_control_state
inventory_permission_state
source_device_id
store_id
inventory_instance_id
schema_version
event_type
event_id
idempotency_key
sequence_number
occurred_at
payload_hash
payload_signature
receipt_event_id
receipt_status
```

## Threat review

| Threat | Future ScanOps control | Inventory mutation allowed |
| --- | --- | --- |
| Event submitted before trust | Keep local or defer | No |
| Wrong Inventory target | Defer and require operator action | No |
| Payload changed after queueing | Refuse submission eligibility | No |
| Retry uses new event id | Refuse retry | No |
| Receipt event mismatch | Operator action required | No |
| Receipt missing | Pending or retry by policy | No |
| Rejected trust receipt | Mark rejected locally | No |
| Quarantine receipt | Operator action required | No |
| Disabled Inventory state | Defer submission | No |
| Operator misuse | Role and audit controls in later workflow | No direct bridge mutation |

## Credential-handling expectations

A future implementation must define:

- local credential storage model;
- rotation policy;
- revocation response;
- signing approach;
- payload hash approach;
- receipt verification approach;
- recovery process for lost or replaced devices.

Phase 1H-D does not create or store credential material.

## Audit expectations

A future implementation must preserve local audit evidence for:

- source device id;
- source user id;
- event id;
- idempotency key;
- schema version;
- event type;
- local status;
- receipt status;
- reason code;
- receipt id;
- timestamp.

## No-mutation security rule

ScanOps security classification must not directly mutate:

- Inventory stock movements.
- Inventory Item Master records.
- Inventory price records.
- POS sale records.
- Order records.
- Forecast records.
- Posted wastage records.
- Posted store-use records.
- Markdown price activation records.

## Future implementation questions

Before implementation, the team must answer:

- How is Inventory instance identity learned?
- How are device credentials provisioned?
- How are local credentials revoked?
- How are submissions signed?
- How are receipts verified?
- How are receipt mismatches handled?
- How are repeated security failures surfaced to admins?
- How does ScanOps respond when Inventory disables bridge processing?

## Acceptance criteria

Phase 1H-D passes only if this remains security review documentation and no runtime behavior is implemented.
