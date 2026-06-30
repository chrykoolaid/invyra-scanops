# Bridge Phase 2 — Queue Transport Foundation

## Purpose

Prepare a protected ScanOps bridge transport envelope for future queue handoff to Inventory Desktop.

This phase does not activate real network transport. It provides an envelope builder, validator, and simulation helper so later work can connect to the Inventory Desktop listener without changing operational workflows.

## Added helper

```text
src/lib/scanOpsBridgeTransport.js
```

Exports:

- `BRIDGE_TRANSPORT_STATUSES`
- `BRIDGE_TRANSPORT_VERSION`
- `buildBridgeTransportEnvelope`
- `validateBridgeTransportEnvelope`
- `simulateBridgeQueueHandoff`
- `getBridgeTransportHistory`

## Transport envelope intent

The envelope separates:

- Source device context
- Destination desktop bridge profile
- Queue payload summary
- Guardrails
- Contract version

This prevents workflow screens from knowing transport details.

## Guardrails

Every transport envelope includes:

```json
{
  "inventory_write": false,
  "ledger_mutation": false,
  "stock_mutation": false,
  "price_mutation": false,
  "sync_contract_change": false
}
```

The validator blocks envelopes that attempt mutation.

## What this phase does not do

This phase does not:

- POST to Inventory Desktop
- Open sockets
- Change sync queue status
- Mutate stock
- Mutate price
- Change ledger behaviour
- Change audit behaviour
- Approve or post Inventory transactions
- Bypass Inventory Desktop

## Acceptance criteria

- Transport envelope can be built from a queue item and desktop profile.
- Envelope validation blocks missing desktop profile data.
- Envelope validation blocks mutation guardrail drift.
- Simulation result can be written to local history.
- Existing ScanOps queue engine remains untouched.
- No operational workflow code is changed.

## Next phase

Bridge Phase 3 should define the Inventory Desktop listener contract and expected receipt envelope before real transport is enabled.
