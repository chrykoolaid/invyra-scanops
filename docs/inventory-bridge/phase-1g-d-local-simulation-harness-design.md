# Invyra ScanOps Bridge Phase 1G-D Local Simulation Harness Design

Status: design only  
Component: ScanOps / `chrykoolaid/invyra-scanops`  
Phase: `1G-D`  
Runtime state: not implemented and not activated

## Purpose

Phase 1G-D defines how a future local-only simulation harness should exercise the static ScanOps outbox and receipt fixtures without enabling runtime bridge behavior.

This document does not add executable harness code. It does not create an outbox store, transport client, sync loop, replay engine, local persistence write, or Inventory mutation.

## Design goal

The future simulation harness should prove that ScanOps and Inventory can agree on event and receipt shapes before runtime activation work begins.

It should operate entirely against static fixtures and in-memory test objects.

## ScanOps-side simulation responsibilities

A future ScanOps-side simulation harness may validate:

- The static outbox event fixture can be parsed as static data.
- Required fields are present.
- Event type is evidence-only.
- Idempotency key exists.
- Payload hash field exists.
- Signature placeholder field exists.
- Receipt status vocabulary is understood.
- Accepted-to-ledger receipt maps to a local accepted-to-inventory-ledger state.
- Temporary-failure receipt maps to a retry-scheduled state.

## Non-goals

The future simulation harness must not:

- Open a network connection.
- Call Inventory.
- Call an API endpoint.
- Create an IndexedDB store.
- Write local outbox records.
- Run a replay engine.
- Mark a real event as submitted.
- Mark a real event as accepted.
- Write Inventory data.
- Change stock, price, POS, order, forecast, or Item Master data.

## Proposed future simulation flow

```text
1. Load static ScanOps outbox fixture.
2. Validate required envelope fields in memory.
3. Confirm event type is evidence-only.
4. Load static Inventory receipt fixture.
5. Confirm receipt references the expected event id.
6. Confirm receipt status is known.
7. Map receipt to proposed ScanOps local status in memory.
8. Produce local-only simulation report.
```

## Proposed future report fields

A future report may include:

```text
simulation_id
phase
repo
fixture_name
event_id
outbox_status
receipt_status
known_event_type
required_fields_present
receipt_status_known
runtime_activation_attempted
network_access_attempted
local_write_attempted
inventory_write_attempted
mutation_attempted
result
notes
```

The expected values for safety fields must be:

```text
runtime_activation_attempted=false
network_access_attempted=false
local_write_attempted=false
inventory_write_attempted=false
mutation_attempted=false
```

## Fixture boundaries

Fixtures are static examples only. They are not real device data, real store data, real signatures, real hashes, real outbox records, real receipts, or live Inventory references.

The future harness must treat all fixture values as examples.

## Required hard stop behavior

A future simulation harness must stop if it detects any attempt to:

- Open network transport.
- Import runtime bridge modules.
- Write local outbox data.
- Send events.
- Process live receipts.
- Write Inventory data.
- Mutate stock, price, POS, order, forecast, or Item Master data.

## Acceptance criteria

Phase 1G-D passes only if this remains design documentation and no executable simulation harness is added.
