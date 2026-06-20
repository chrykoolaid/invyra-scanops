import fs from 'node:fs';
import path from 'node:path';
import {
  assertNoScanOpsInventoryBridgePairingOperationalMutation,
} from '../src/lib/inventoryBridge/pairingContract.js';

const root = process.cwd();
const contractPath = 'src/lib/inventoryBridge/pairingContract.js';

const originalRequest = Object.freeze({
  bridge_protocol_version: '1.0.0',
  pairing_contract_version: '1.0.0',
  source_system: 'scanops',
  source_device_id: 'SCANOPS-DEVICE-001',
  device_name: 'ScanOps Handheld 001',
  device_type: 'HANDHELD_SCANNER',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  environment: 'LIVE',
  requested_at: new Date().toISOString(),
  pairing_method: 'QR_CODE',
  pairing_ref: 'PAIR-REF-001',
  challenge_ref: 'CHALLENGE-REF-001',
});

const approvedReceiptFixture = Object.freeze({
  bridge_protocol_version: '1.0.0',
  pairing_contract_version: '1.0.0',
  pairing_receipt_id: 'PAIRING-RECEIPT-APPROVED-001',
  pairing_ref: 'PAIR-REF-001',
  source_device_id: 'SCANOPS-DEVICE-001',
  device_status: 'TRUSTED',
  pairing_status: 'TRUSTED',
  result_code: 'DEVICE_TRUSTED',
  decision_message: 'Device is trusted for bridge transport. Ingestion validation still runs per event.',
  trusted: true,
  linked_device_ref: 'InventoryBridgeDevice:SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  reviewed_by: 'admin-001',
  reviewed_at: new Date().toISOString(),
  issued_at: new Date().toISOString(),
  schema_version: '1.0.0',
});

const requiredReceiptFields = Object.freeze([
  'bridge_protocol_version',
  'pairing_contract_version',
  'pairing_receipt_id',
  'pairing_ref',
  'source_device_id',
  'device_status',
  'pairing_status',
  'result_code',
  'environment',
  'store_id',
  'inventory_instance_id',
  'linked_device_ref',
  'reviewed_by',
  'reviewed_at',
  'issued_at',
]);

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
  if (!fs.existsSync(filePath)) throw new Error(`Missing required file: ${relativePathname}`);
  return fs.readFileSync(filePath, 'utf8');
}

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

function redact(value) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 8) return '••••';
  return `${text.slice(0, 4)}••••${text.slice(-4)}`;
}

function parseDateMs(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
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
  const ownSource = stripComments(readRequired('scripts/validate-scanops-inventory-bridge-approved-receipt-acceptance.mjs'));
  const contractSource = stripComments(readRequired(contractPath));

  for (const forbidden of forbiddenOperationalCalls) {
    assert(!forbidden.pattern.test(ownSource), `validator contains forbidden operational call: ${forbidden.label}`);
    assert(!forbidden.pattern.test(contractSource), `${contractPath} contains forbidden operational call: ${forbidden.label}`);
  }
}

function validateApprovedReceipt(receipt, request) {
  const errors = [];

  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return { ok: false, code: 'PAIRING_RECEIPT_INVALID', errors: ['Receipt must be an object.'] };
  }

  for (const field of requiredReceiptFields) {
    if (!receipt[field]) errors.push(`Missing ${field}.`);
  }

  if (receipt.bridge_protocol_version !== request.bridge_protocol_version) errors.push('PAIRING_PROTOCOL_MISMATCH');
  if (receipt.pairing_contract_version !== request.pairing_contract_version) errors.push('PAIRING_PROTOCOL_MISMATCH');
  if (receipt.environment !== request.environment) errors.push('PAIRING_ENVIRONMENT_MISMATCH');
  if (receipt.store_id !== request.store_id) errors.push('PAIRING_STORE_MISMATCH');
  if (receipt.inventory_instance_id !== request.inventory_instance_id) errors.push('PAIRING_INSTANCE_MISMATCH');
  if (receipt.pairing_ref !== request.pairing_ref) errors.push('PAIRING_REF_MISMATCH');
  if (receipt.source_device_id !== request.source_device_id) errors.push('PAIRING_DEVICE_MISMATCH');
  if (!parseDateMs(receipt.issued_at)) errors.push('PAIRING_RECEIPT_INVALID_DATE');
  if (!parseDateMs(receipt.reviewed_at)) errors.push('PAIRING_RECEIPT_REVIEW_MISSING');

  if (receipt.device_status !== 'TRUSTED') errors.push('PAIRING_RECEIPT_NOT_TRUSTED');
  if (receipt.pairing_status !== 'TRUSTED') errors.push('PAIRING_RECEIPT_NOT_TRUSTED');
  if (receipt.result_code !== 'DEVICE_TRUSTED') errors.push('PAIRING_RECEIPT_RESULT_MISMATCH');
  if (receipt.trusted !== true) errors.push('PAIRING_RECEIPT_MUST_TRUST_DEVICE');
  if (!receipt.linked_device_ref) errors.push('PAIRING_RECEIPT_LINK_REQUIRED');
  if (!receipt.reviewed_by) errors.push('PAIRING_RECEIPT_REVIEW_MISSING');

  if (errors.length) {
    return {
      ok: false,
      code: errors.find((error) => error.startsWith('PAIRING_')) || 'PAIRING_RECEIPT_INVALID',
      errors,
    };
  }

  return {
    ok: true,
    code: 'APPROVED_PAIRING_RECEIPT_ACCEPTED',
    local_pairing_state: 'READY_FOR_BRIDGE_TRANSPORT_PENDING_RELAY',
    trusted: true,
    can_sync_events: false,
    can_use_relay_as_trusted_device: false,
    relay_enforcement_still_required: true,
    ingestion_validation_still_required_per_event: true,
    no_local_storage_write: true,
    no_event_sync: true,
    no_relay_enforcement: true,
  };
}

function getReceiptSafeSummary(receipt = {}) {
  return {
    bridge_protocol_version: receipt.bridge_protocol_version || null,
    pairing_contract_version: receipt.pairing_contract_version || null,
    pairing_receipt_id: receipt.pairing_receipt_id || null,
    pairing_ref: redact(receipt.pairing_ref),
    source_device_id: receipt.source_device_id || null,
    device_status: receipt.device_status || null,
    pairing_status: receipt.pairing_status || null,
    result_code: receipt.result_code || null,
    trusted: receipt.trusted ?? null,
    linked_device_ref: receipt.linked_device_ref || null,
    environment: receipt.environment || null,
    store_id: receipt.store_id || null,
    inventory_instance_id: receipt.inventory_instance_id || null,
    reviewed_by: receipt.reviewed_by || null,
    reviewed_at: receipt.reviewed_at || null,
    issued_at: receipt.issued_at || null,
  };
}

function main() {
  assertNoForbiddenOperationalCalls();

  const accepted = validateApprovedReceipt(approvedReceiptFixture, originalRequest);
  assertObjectSubset(
    accepted,
    {
      ok: true,
      code: 'APPROVED_PAIRING_RECEIPT_ACCEPTED',
      local_pairing_state: 'READY_FOR_BRIDGE_TRANSPORT_PENDING_RELAY',
      trusted: true,
      can_sync_events: false,
      can_use_relay_as_trusted_device: false,
      relay_enforcement_still_required: true,
      ingestion_validation_still_required_per_event: true,
      no_local_storage_write: true,
      no_event_sync: true,
      no_relay_enforcement: true,
    },
    'approved receipt acceptance'
  );

  assertObjectSubset(
    validateApprovedReceipt({ ...approvedReceiptFixture, trusted: false }, originalRequest),
    { ok: false, code: 'PAIRING_RECEIPT_MUST_TRUST_DEVICE' },
    'untrusted approved receipt rejected'
  );

  assertObjectSubset(
    validateApprovedReceipt({ ...approvedReceiptFixture, linked_device_ref: null }, originalRequest),
    { ok: false, code: 'PAIRING_RECEIPT_LINK_REQUIRED' },
    'missing linked device ref rejected'
  );

  assertObjectSubset(
    validateApprovedReceipt({ ...approvedReceiptFixture, reviewed_by: null }, originalRequest),
    { ok: false, code: 'PAIRING_RECEIPT_REVIEW_MISSING' },
    'missing reviewer rejected'
  );

  assertObjectSubset(
    validateApprovedReceipt({ ...approvedReceiptFixture, pairing_ref: 'PAIR-OTHER' }, originalRequest),
    { ok: false, code: 'PAIRING_REF_MISMATCH' },
    'pairing ref mismatch rejected'
  );

  assertObjectSubset(
    validateApprovedReceipt({ ...approvedReceiptFixture, source_device_id: 'SCANOPS-OTHER' }, originalRequest),
    { ok: false, code: 'PAIRING_DEVICE_MISMATCH' },
    'source device mismatch rejected'
  );

  assertObjectSubset(
    validateApprovedReceipt({ ...approvedReceiptFixture, environment: 'TRAINING' }, originalRequest),
    { ok: false, code: 'PAIRING_ENVIRONMENT_MISMATCH' },
    'environment mismatch rejected'
  );

  assertObjectSubset(
    validateApprovedReceipt({ ...approvedReceiptFixture, device_status: 'PENDING', pairing_status: 'PENDING_APPROVAL' }, originalRequest),
    { ok: false, code: 'PAIRING_RECEIPT_NOT_TRUSTED' },
    'pending status receipt rejected'
  );

  const summary = getReceiptSafeSummary(approvedReceiptFixture);
  assert(summary.pairing_ref !== approvedReceiptFixture.pairing_ref, 'safe summary must redact pairing_ref.');
  assertEqual(summary.trusted, true, 'safe summary trusted');
  assertEqual(summary.linked_device_ref, approvedReceiptFixture.linked_device_ref, 'safe summary linked_device_ref');

  const mutationGuardrails = assertNoScanOpsInventoryBridgePairingOperationalMutation();
  assertObjectSubset(mutationGuardrails, requiredGuardrails, 'mutation guardrails');

  console.log('ScanOps approved pairing receipt acceptance validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps approved pairing receipt acceptance validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
