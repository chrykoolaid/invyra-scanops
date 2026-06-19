import fs from 'node:fs';
import path from 'node:path';
import {
  SCANOPS_INVENTORY_BRIDGE_PAIRING_CONTRACT_VERSION,
  SCANOPS_INVENTORY_BRIDGE_PROTOCOL_VERSION,
  assertNoScanOpsInventoryBridgePairingOperationalMutation,
  buildScanOpsInventoryBridgePairingRequest,
  getScanOpsInventoryBridgePairingRequestSafeSummary,
  validateScanOpsInventoryBridgePairingRequest,
} from '../src/lib/inventoryBridge/pairingContract.js';

const root = process.cwd();
const contractPath = 'src/lib/inventoryBridge/pairingContract.js';

const requiredGuardrails = Object.freeze({
  scanops_side_contract_only: true,
  no_live_pairing: true,
  no_qr_ui: true,
  no_manual_ip_ui: true,
  no_device_registry_ui: true,
  no_device_approval_workflow: true,
  no_inventory_writes: true,
  no_entity_writes: true,
  no_event_sync: true,
  no_scanops_sync_mutation: true,
  no_relay_enforcement: true,
  no_ui: true,
  no_stock_mutation: true,
  no_price_mutation: true,
  no_pos_order_forecast_mutation: true,
  no_item_master_mutation: true,
  ingestion_validation_still_required_per_event: true,
  base44_cloud_relay_not_lan_bridge: true,
});

const forbiddenOperationalCalls = Object.freeze([
  { label: 'fetch', pattern: /\bfetch\s*\(/ },
  { label: 'processInboundScanOpsEvent', pattern: /processInboundScanOpsEvent\s*\(/ },
  { label: 'InventorySyncInboundEvent.create', pattern: /InventorySyncInboundEvent\s*\.\s*create\s*\(/ },
  { label: 'InventorySyncReceipt.create', pattern: /InventorySyncReceipt\s*\.\s*create\s*\(/ },
  { label: 'MarkdownSyncReviewQueue.create', pattern: /MarkdownSyncReviewQueue\s*\.\s*create\s*\(/ },
  { label: 'InventoryBridgeDevice.create/update/delete', pattern: /InventoryBridgeDevice\s*\.\s*(create|update|delete)\s*\(/ },
  { label: 'StockMovement.create', pattern: /StockMovement\s*\.\s*create\s*\(/ },
  { label: 'POSLineItem.create', pattern: /POSLineItem\s*\.\s*create\s*\(/ },
  { label: 'event_outbox writes', pattern: /event_outbox\s*\.\s*(add|put|set|create|update|delete)\s*\(/ },
  { label: 'localStorage writes', pattern: /localStorage\s*\.\s*setItem\s*\(/ },
]);

function readRequired(relativePathname) {
  const filePath = path.join(root, relativePathname);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${relativePathname}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertObjectSubset(actual, expected, label) {
  assert(actual && typeof actual === 'object', `${label}: expected object.`);

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key];
    if (expectedValue && typeof expectedValue === 'object' && !Array.isArray(expectedValue)) {
      assertObjectSubset(actualValue, expectedValue, `${label}.${key}`);
    } else {
      assertEqual(actualValue, expectedValue, `${label}.${key}`);
    }
  }
}

function assertNoForbiddenOperationalCalls() {
  const source = stripComments(readRequired(contractPath));
  for (const forbidden of forbiddenOperationalCalls) {
    assert(!forbidden.pattern.test(source), `${contractPath} contains forbidden operational call: ${forbidden.label}`);
  }
}

function assertValidation(input, expected, label, options = {}) {
  const validation = validateScanOpsInventoryBridgePairingRequest(input, options.expected || {});
  assertObjectSubset(validation, expected, label);
  return validation;
}

function main() {
  assertNoForbiddenOperationalCalls();

  const validRequest = buildScanOpsInventoryBridgePairingRequest({
    source_device_id: 'SCANOPS-DEVICE-001',
    device_name: 'ScanOps Handheld 001',
    device_type: 'HANDHELD_SCANNER',
    source_user_id: 'staff-001',
    source_user_role: 'Staff',
    store_id: 'STORE-001',
    inventory_instance_id: 'INV-INSTANCE-001',
    environment: 'LIVE',
    pairing_method: 'QR_CODE',
    pairing_ref: 'PAIR-REF-001',
    challenge_ref: 'CHALLENGE-REF-001',
  });

  assertValidation(
    validRequest,
    {
      ok: true,
      code: 'PAIRING_REQUEST_VALID',
    },
    'valid ScanOps pairing request'
  );

  assertEqual(validRequest.source_system, 'scanops', 'validRequest.source_system');
  assertEqual(validRequest.bridge_protocol_version, SCANOPS_INVENTORY_BRIDGE_PROTOCOL_VERSION, 'bridge protocol version');
  assertEqual(validRequest.pairing_contract_version, SCANOPS_INVENTORY_BRIDGE_PAIRING_CONTRACT_VERSION, 'pairing contract version');
  assertEqual(validRequest.prototype_transport, true, 'validRequest.prototype_transport');
  assert(
    validRequest.transport_note.includes('not a local LAN bridge'),
    'validRequest.transport_note must preserve Base44 cloud relay guardrail.'
  );

  assertValidation(
    { ...validRequest, source_device_id: null },
    {
      ok: false,
      code: 'PAIRING_REQUEST_INVALID',
    },
    'source_device_id required'
  );

  assertValidation(
    { ...validRequest, device_name: '' },
    {
      ok: false,
      code: 'PAIRING_REQUEST_INVALID',
    },
    'device_name required'
  );

  assertValidation(
    { ...validRequest, device_type: 'PHONE' },
    {
      ok: false,
      code: 'PAIRING_REQUEST_INVALID',
    },
    'device_type enum validation'
  );

  for (const environment of ['LIVE', 'TRAINING', 'TEST']) {
    const request = buildScanOpsInventoryBridgePairingRequest({
      ...validRequest,
      environment,
    });
    assertValidation(
      request,
      {
        ok: true,
        code: 'PAIRING_REQUEST_VALID',
      },
      `environment ${environment} valid`
    );
  }

  assertValidation(
    { ...validRequest, environment: 'STAGING' },
    {
      ok: false,
      code: 'PAIRING_REQUEST_INVALID',
    },
    'environment enum validation'
  );

  assertValidation(
    { ...validRequest, environment: 'TRAINING' },
    {
      ok: false,
      code: 'PAIRING_ENVIRONMENT_MISMATCH',
    },
    'environment mismatch validation',
    { expected: { environment: 'LIVE' } }
  );

  for (const pairingMethod of ['QR_CODE', 'MANUAL_IP', 'ADMIN_PROVISIONED']) {
    const request = buildScanOpsInventoryBridgePairingRequest({
      ...validRequest,
      pairing_method: pairingMethod,
    });
    assertValidation(
      request,
      {
        ok: true,
        code: 'PAIRING_REQUEST_VALID',
      },
      `pairing method ${pairingMethod} valid`
    );
  }

  assertValidation(
    { ...validRequest, pairing_method: 'BLUETOOTH' },
    {
      ok: false,
      code: 'PAIRING_REQUEST_INVALID',
    },
    'pairing_method enum validation'
  );

  assertValidation(
    { ...validRequest, bridge_protocol_version: '0.9.0' },
    {
      ok: false,
      code: 'PAIRING_PROTOCOL_MISMATCH',
    },
    'bridge_protocol_version validation'
  );

  assertValidation(
    { ...validRequest, pairing_contract_version: '0.9.0' },
    {
      ok: false,
      code: 'PAIRING_PROTOCOL_MISMATCH',
    },
    'pairing_contract_version validation'
  );

  assertValidation(
    { ...validRequest, requested_at: 'not-a-date' },
    {
      ok: false,
      code: 'PAIRING_REQUEST_INVALID',
    },
    'requested_at ISO validation'
  );

  const summary = getScanOpsInventoryBridgePairingRequestSafeSummary(validRequest);
  assert(summary.pairing_ref !== validRequest.pairing_ref, 'safe summary must redact pairing_ref.');
  assert(summary.challenge_ref !== validRequest.challenge_ref, 'safe summary must redact challenge_ref.');

  const mutationGuardrails = assertNoScanOpsInventoryBridgePairingOperationalMutation();
  assertObjectSubset(mutationGuardrails, requiredGuardrails, 'mutation guardrails');

  console.log('ScanOps inventory bridge pairing contract validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps inventory bridge pairing contract validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
