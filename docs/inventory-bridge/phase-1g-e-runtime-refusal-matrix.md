# Phase 1G-E Runtime Refusal Matrix

Status: design only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Purpose

Define future cases where ScanOps must refuse or defer bridge runtime behavior.

## Refusal matrix

| Condition | Future effective result |
| --- | --- |
| Missing configuration | Disabled |
| Malformed configuration | Disabled |
| Unknown Inventory target | Disabled |
| Feature flag false | Disabled |
| Stop control active | Disabled |
| Inventory disabled state | Disabled |
| Device not paired | Defer |
| Store scope missing | Defer |
| Inventory instance missing | Defer |
| Unknown event type | Refuse or defer |
| Missing idempotency key | Refuse or defer |
| Missing receipt for submitted event | Pending only |

## Required invariant

A refusal or deferral must not create local operational writes or Inventory changes.

## Forbidden in this phase

- No runtime refusal implementation.
- No executable code.
- No transport.
- No replay.
- No local persistence writes.
- No Inventory mutation.
