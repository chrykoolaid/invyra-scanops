# Bridge Phase 1 — Desktop Pairing and Discovery Foundation

## Purpose

Create a protected ScanOps foundation for pairing a handheld with an Inventory Desktop bridge profile.

This is a foundation pass only. It does not activate live transport or change Inventory Desktop behaviour.

## Locked architecture

```text
Inventory Desktop = system of record
ScanOps = handheld operational execution layer
Bridge = governed handoff boundary
```

ScanOps may store local pairing metadata, known desktop profiles, discovery candidates, and test results.

ScanOps must not bypass the bridge or write directly to Inventory Desktop.

## Supported pairing layers

### 1. QR pairing

Inventory Desktop may later show a pairing QR code.

The QR payload can contain:

```json
{
  "bridgeId": "desktop-store-001",
  "name": "Back Office Inventory",
  "host": "192.168.1.50",
  "port": "8080",
  "storeId": "STORE-001"
}
```

ScanOps parses this into a local desktop pairing profile.

### 2. Local network discovery

ScanOps may later discover Inventory Desktop bridge candidates on the current local network.

This pass only provides safe local candidate helpers. It does not perform real network probing.

### 3. Known desktop reconnect

ScanOps can retain local known desktop profiles for quick reconnect.

### 4. Manual host fallback

IT or a supervisor may enter IP, hostname, and port manually when QR or discovery is unavailable.

## Added foundation helper

```text
src/lib/scanOpsDesktopPairing.js
```

Exports:

- `DESKTOP_PAIRING_METHODS`
- `buildDesktopPairingProfile`
- `getKnownDesktopPairingProfiles`
- `saveKnownDesktopPairingProfile`
- `buildManualDesktopPairingDraft`
- `parseDesktopPairingQr`
- `discoverLocalDesktopPairingProfiles`
- `getLastDesktopDiscoveryResults`

## Guardrails

This phase does not change:

- Inventory bridge contracts
- Sync transport contracts
- Inventory Desktop ownership
- Ledger behaviour
- Audit behaviour
- Stock posting
- Price mutation
- User permissions
- Wi-Fi joining or password management

## Acceptance criteria

- Desktop profile helpers exist.
- QR parsing can produce a local pairing profile.
- Manual fallback can produce a local pairing profile.
- Discovery helper can produce local candidate profiles.
- Known desktop profiles can be saved/read locally.
- Every generated object includes `stock_mutation: false`.
- No runtime transport is activated.

## Next phase

Bridge Phase 2 should connect these pairing profiles to the real queue transport layer after the Inventory Desktop bridge listener contract is ready.
