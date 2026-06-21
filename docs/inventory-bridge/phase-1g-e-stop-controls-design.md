# Phase 1G-E Stop Controls Design

Status: design only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Runtime state: not implemented and not activated

## Purpose

Define future ScanOps-side stop-control expectations for any later bridge runtime proposal.

## Required future stop-control layers

```text
Global bridge stop control
Store-level bridge stop control
Device-level bridge stop control
Event-type stop control
Inventory disabled-state control
Emergency operator stop control
```

## Required safe behavior

If any stop control is active, future ScanOps bridge behavior must remain disabled.

ScanOps must not send events, process live receipts, or mark records as submitted while disabled.

## Future disabled-state outcomes

A future design may use safe local states such as:

```text
LOCAL_DISABLED
WAITING_FOR_INVENTORY_PERMISSION
DEFERRED_DISABLED
```

Exact wording must be approved in a later implementation phase.

## Required audit expectations

A future implementation must audit:

- who changed a stop control;
- when it changed;
- previous state;
- new state;
- reason;
- affected scope.

## Explicitly forbidden in this phase

- No stop-control implementation.
- No runtime guard code.
- No outbox processing.
- No transport.
- No local persistence writes.
- No Inventory mutation.
