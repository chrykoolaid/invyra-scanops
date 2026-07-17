#!/usr/bin/env node
import { createScanOpsTestTransportClientV1 } from '../src/inventory-bridge/testTransport/v1/index.js';

const client = createScanOpsTestTransportClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TEST',
  inventoryHost: 'invalid host',
  inventoryPort: 8787,
  timeoutMs: 100,
  now: () => '2026-07-17T12:00:00.000Z',
});

const result = await client.sendHealthPing({
  envelopeId: 'env:test:health:000001',
  idempotencyKey: 'idem:test:health:000001',
  traceId: 'trace:test:health:000001',
  occurredAt: '2026-07-17T12:00:00.000Z',
  deviceId: 'scanops-device-001',
  storeId: 'store-001',
  sessionId: 'session-001',
  inventoryInstanceId: 'inventory-instance-001',
  payload: { requestType: 'BRIDGE_HEALTH', clientTime: '2026-07-17T12:00:00.000Z' },
});

const passed = result.status === 'TRANSPORT_ERROR'
  && result.dispatchAttempted === true
  && result.receiptReceived === false
  && result.retryScheduled === false
  && result.replayAttempted === false
  && result.queueWriteAttempted === false
  && result.persistenceAttempted === false
  && result.inventoryMutationAttempted === false
  && result.scanOpsMutationAttempted === false;

console.log(JSON.stringify({ phase: '35-A', check: 'invalid_host_fails_safely', passed, result }, null, 2));
if (!passed) process.exit(1);
