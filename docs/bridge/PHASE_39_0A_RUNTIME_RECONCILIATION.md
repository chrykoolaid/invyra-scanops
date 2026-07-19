# Phase 39-0A — ScanOps Runtime Reconciliation and Connection Setup Readiness

Date: 2026-07-19

Repository: `chrykoolaid/invyra-scanops`

Companion repository: `chrykoolaid/invyra-base44`

## Baseline inspected

- ScanOps `main`: `31f9e6605b95f5d8e907cf8dac2f01a13685d8d0`
- Inventory inspected `main`: `bbfd5ae270d06bcaf1a2d1d2441407c9c05adbb5`
- Inventory Phase 38-A merge: `213ced228f128a0f3f9d5023e8865a66bf2c520d`
- Open pull requests at inspection time: none in either repository

## Decision

| Decision | Result |
| --- | --- |
| Can the current ScanOps UI perform a real pairing or health request to Inventory? | **FAIL** |
| Is ScanOps ready for a controlled connection-setup implementation phase? | **PASS** |
| Is Receiving integration authorised? | **BLOCKED** |
| Required next phase | **Phase 39-0B — Browser-Compatible Pairing and Connection Test Wiring** |

The Phase 35-A through Phase 38-A bridge code is present. The missing work is the browser/runtime adapter and UI wiring.

## Current ScanOps architecture

### Web application shell

ScanOps is currently a Vite/React web application. It is not yet packaged as an Android native application, Electron process, or another runtime that can directly execute Node-only modules.

### Visible Sync & Connectivity UI

The current screens expose the intended workflow, but the actions are not connected to the certified runtime services.

`src/pages/SyncHandoff.jsx` currently:

- stores desktop name, host, port, store, and path in browser local storage;
- labels a profile as connected when an endpoint profile exists;
- implements `testConnection()` by checking whether a name or IP address is saved;
- returns `Profile ready` without sending an HTTP request;
- describes QR pairing and discovery as future layers;
- does not call the Phase 35-A health client;
- does not call the Phase 36-A pairing client.

`src/lib/scanOpsConnectivity.js` also calculates connection status from local profile, network, and queue state. Its `runConnectionTest()` does not contact Inventory.

The current UI therefore proves configuration visibility only, not connectivity.

### Phase 35-A health transport client

`src/inventory-bridge/testTransport/v1/scanOpsTestTransportClientV1.js` provides a real fetch-based `DEVICE_HEALTH_PING` client with canonical receipt validation and TEST/TRAINING gates.

It is not imported by the live Sync & Connectivity UI.

### Phase 36-A ephemeral pairing client

`src/inventory-bridge/pairing/v1/scanOpsEphemeralPairingClientV1.js` implements:

- pairing-offer decoding;
- Ed25519 key generation;
- signed pairing confirmation;
- trust-response validation;
- temporary in-memory paired profile;
- health transport option derivation.

The certified implementation imports `node:crypto` and uses `Buffer`. It is suitable for Node certification but is not directly safe to import into the current Vite browser bundle.

A browser-compatible adapter using Web Crypto and browser-native base64url handling is required for the web pilot. It must preserve the exact Phase 36-A proof and response semantics.

### Phase 37-A and Phase 38-A

The reliable outbound queue and count handoff are certified Node-side components. Their durability uses filesystem-backed persistence and is not wired to the current browser workflow queue.

Phase 39-0B is limited to pairing and health connectivity. It must not pretend that the browser UI has already inherited the Phase 37-A filesystem durability.

## Root cause

The current ScanOps screens are a presentation/configuration layer. The certified bridge clients are separate Node-oriented modules. There is no browser runtime adapter joining the two.

The missing adapter must provide:

1. safe parsing of an Inventory pairing QR payload;
2. browser-native Ed25519 proof generation for the controlled pilot;
3. actual HTTP pairing confirmation;
4. in-memory temporary trust;
5. actual canonical `DEVICE_HEALTH_PING` dispatch;
6. canonical receipt validation and correlation;
7. explicit error states for timeout, CORS, mixed content, rejected trust, expiry, and invalid receipt;
8. zero business mutation.

## Runtime constraint

The first pilot cannot silently assume that a hosted HTTPS ScanOps page can call an HTTP service on `192.168.x.x`. Browser mixed-content and private-network rules may block that request.

Phase 39-0B must certify one explicit test runtime. The approved first pilot is:

```text
ScanOps served in the controlled local TEST/TRAINING pilot
+ Inventory local bridge host on the same private LAN
+ explicit allowed origin
+ explicit private-LAN host and port
```

Hosted Base44 HTTPS-to-private-HTTP operation remains uncertified.

## Approved Phase 39-0B ScanOps design

### Browser pairing adapter

Add a browser-only adapter separate from the Node certification client. It must:

- support TEST and TRAINING only;
- reject LIVE and PRODUCTION;
- decode only `invyra-pairing-v1:` offers;
- validate offer format, version, environment, expiry, store, Inventory instance, private host, port, and path;
- use browser Web Crypto Ed25519 where supported;
- fail clearly when the browser lacks required crypto support;
- keep the private key and trust state in memory for the first pilot;
- never write credentials or private keys to local storage;
- preserve the signed proof fields and response validation from Phase 36-A.

### Real connection test

Replace the local-profile-only test with:

```text
saved or paired Inventory endpoint
→ build canonical DEVICE_HEALTH_PING
→ send HTTP request
→ validate canonical receipt
→ verify envelope, idempotency, and trace correlation
→ display the real result
```

The UI must not display `Connected` merely because a host is saved.

### Connection profile storage

Local storage may retain non-secret operator convenience fields only:

```text
desktop_name
inventory_host
inventory_port
inventory_instance_id
store_id
environment
last_successful_health_at
```

It must not retain:

```text
private key
pairing token
pairing challenge
reusable credential
raw secret-bearing QR payload
```

### UI states

The Sync & Connectivity UI must use clear states:

```text
NOT_CONFIGURED
CONFIGURED_UNTESTED
PAIRING
PAIRED_TEMPORARY
CONNECTING
CONNECTED
OFFLINE
TRUST_EXPIRED
REJECTED
CORS_BLOCKED
MIXED_CONTENT_BLOCKED
UNSUPPORTED_BROWSER
ERROR
```

`Ready` in the app header must remain scanner/session readiness and must not be presented as bridge readiness.

## Required Phase 39-0B UI behavior

### Manual setup

Manual host entry must:

- validate a private IPv4 address or approved `.local` host;
- require a valid port;
- require TEST or TRAINING;
- require non-placeholder store and Inventory instance identifiers;
- save the profile as `CONFIGURED_UNTESTED`;
- immediately offer a real connection test.

### QR setup

QR setup must:

- accept the exact Phase 36-A QR payload;
- show Inventory name/instance, store, environment, endpoint, and expiry before confirmation;
- submit the signed pairing confirmation;
- show the temporary trust expiry;
- proceed to a real health test;
- clear the raw offer after use.

Camera capture may reuse the existing scanner input path. A typed/pasted QR payload is acceptable only as a TEST fallback.

### Discovery

Local discovery may remain deferred during Phase 39-0B. It must not block manual or QR connection certification.

## Mandatory acceptance tests

- profile-only configuration does not show Connected;
- no-host state stays NOT_CONFIGURED;
- invalid public host is rejected;
- invalid port is rejected;
- LIVE is rejected;
- PRODUCTION is rejected;
- valid TEST manual profile can call Inventory health;
- valid TRAINING manual profile can call Inventory health;
- timeout displays a recoverable error;
- CORS failure displays a specific action message where detectable;
- mixed-content risk is detected before dispatch where detectable;
- invalid receipt is rejected;
- uncorrelated receipt is rejected;
- QR offer expiry is enforced;
- QR replay is blocked locally;
- valid signed pairing creates temporary in-memory trust;
- trust expiry blocks the next trusted action;
- private key and pairing token are not stored in local storage;
- zero Inventory, ScanOps, stock, ledger, Item Master, pricing, POS, order, supplier, or approval mutation.

## Implementation order

1. Add the browser pairing adapter and its deterministic tests.
2. Add the browser health transport adapter or safely reuse the Phase 35-A client where its import graph is browser-compatible.
3. Add a connection state store that separates saved profile, temporary trust, and last verified health.
4. Wire `SyncHandoff` to real pairing and health operations.
5. Update `scanOpsConnectivity` so bridge state is based on verified health, not profile presence.
6. Add clear recovery messages.
7. Add cross-repository connection certification against the Inventory Phase 39-0B runtime host.
8. Do not wire Receiving.

## Guardrails

- TEST/TRAINING only.
- LIVE blocked.
- PRODUCTION blocked.
- Disabled by default.
- No Receiving submission.
- No stock or ledger mutation.
- No Item Master creation.
- No automatic approval.
- No background business operation.
- No fake successful connection result.
- No secret persistence.
- No feature drift.

## Phase closure

Phase 39-0A authorises Phase 39-0B connection setup implementation only.

Receiving remains blocked until a real paired health connection passes on the approved pilot runtime.
