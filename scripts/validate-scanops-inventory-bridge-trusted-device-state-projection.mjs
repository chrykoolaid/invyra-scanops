import fs from 'node:fs';
import path from 'node:path';
import {
  assertNoScanOpsInventoryBridgePairingOperationalMutation,
} from '../src/lib/inventoryBridge/pairingContract.js';

const root = process.cwd();
const contractPath = 'src/lib/inventoryBridge/pairingContract.js';

const approvedReceipt = Object.freeze({
  bridge_protocol_version: '1.0.0',
  pairing_contract_version: '1.0.0',
  pairing_receipt_id: 'PAIRING-RECEIPT-APPROVED-001',
  pairing_ref: 'PAIR-REF-001',
  source_device_id: 'SCANOPS-DEVICE-001',
  device_status: 'TRUSTED',
  pairing_status: 'TRUSTED',
  result_code: 'DEVICE_TRUSTED',
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

const localDeviceProfile = Object.freeze({
  source_system: 'scanops',
  source_device_id: 'SCANOPS-DEVICE-001',
  device_name: 'ScanOps Handheld 001',
  device_type: 'HANDHELD_SCANNER',
  app_instance_id: 'SCANOPS-APP-INSTANCE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
});

const guardrails = Object.freeze({
  scanops_trusted_state_projection_only: true,
  local_validator_only: true,
  no_local_storage_write: true,
  no_event_sync: true,
  no_relay_enforcement: true,
  no_inventory_writes: true,
  no_entity_writes: true,
  no_scanops_sync_mutation: true,
  no_ui: true,
  no_qr_ui: true,
  no_manual_ip_ui: true,
  no_device_registry_ui: true,
  no_stock_mutation: true,
  no_price_mutation: true,
  no_pos_order_forecast_mutation: true,
  no_item_master_mutation: true,
  relay_enforcement_still_required: true,
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertSubset(actual, expected, label) {
  assert(actual && typeof actual === 'object', `${label}: expected object.`);
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key];
    if (expectedValue && typeof expectedValue === 'object' && !Array.isArray(expectedValue)) {
      assertSubset(actualValue, expectedValue, `${label}.${key}`);
    } else {
      assertEqual(actualValue, expectedValue, `${label}.${key}`);
    }
  }
}

function assertNoForbiddenOperationalCalls() {
  const ownSource = stripComments(readRequired('scripts/validate-scanops-inventory-bridge-trusted-device-state-projection.mjs'));
  const contractSource = stripComments(readRequired(contractPath));

  for (const forbidden of forbiddenOperationalCalls) {
    assert(!forbidden.pattern.test(ownSource), `validator contains forbidden operational call: ${forbidden.label}`);
    assert(!forbidden.pattern.test(contractSource), `${contractPath} contains forbidden operational call: ${forbidden.label}`);
  }
}

function validateApprovedReceiptForProjection(receipt, profile) {
  if (!receipt || typeof receipt !== 'object') return { ok: false, code: 'APPROVED_RECEIPT_MISSING' };
  if (receipt.device_status !== 'TRUSTED') return { ok: false, code: 'APPROVED_RECEIPT_NOT_TRUSTED' };
  if (receipt.pairing_status !== 'TRUSTED') return { ok: false, code: 'APPROVED_RECEIPT_NOT_TRUSTED' };
  if (receipt.result_code !== 'DEVICE_TRUSTED') return { ok: false, code: 'APPROVED_RECEIPT_RESULT_MISMATCH' };
  if (receipt.trusted !== true) return { ok: false, code: 'APPROVED_RECEIPT_MUST_BE_TRUSTED' };
  if (!receipt.linked_device_ref) return { ok: false, code: 'APPROVED_RECEIPT_LINK_REQUIRED' };
  if (!receipt.reviewed_by || !receipt.reviewed_at) return { ok: false, code: 'APPROVED_RECEIPT_REVIEW_MISSING' };
  if (receipt.source_device_id !== profile.source_device_id) return { ok: false, code: 'PAIRING_DEVICE_MISMATCH' };
  if (receipt.environment !== profile.environment) return { ok: false, code: 'PAIRING_ENVIRONMENT_MISMATCH' };
  if (receipt.store_id !== profile.store_id) return { ok: false, code: 'PAIRING_STORE_MISMATCH' };
  if (receipt.inventory_instance_id !== profile.inventory_instance_id) return { ok: false, code: 'PAIRING_INSTANCE_MISMATCH' };
  return { ok: true, code: 'APPROVED_RECEIPT_PROJECTABLE' };
}

function projectTrustedDeviceState(receipt, profile) {
  const receiptValidation = validateApprovedReceiptForProjection(receipt, profile);
  if (!receiptValidation.ok) {
    return {
      ok: false,
      code: receiptValidation.code,
      receipt_validation: receiptValidation,
      local_state: null,
      guardrails,
    };
  }

  const localState = {
    source_system: profile.source_system,
    source_device_id: profile.source_device_id,
    device_name: profile.device_name,
    device_type: profile.device_type,
    app_instance_id: profile.app_instance_id,
    environment: profile.environment,
    store_id: profile.store_id,
    inventory_instance_id: profile.inventory_instance_id,
    inventory_device_ref: receipt.linked_device_ref,
    pairing_receipt_id: receipt.pairing_receipt_id,
    pairing_ref: receipt.pairing_ref,
    pairing_status: 'TRUSTED_RECEIPT_ACCEPTED',
    local_pairing_state: 'READY_FOR_BRIDGE_TRANSPORT_PENDING_RELAY',
    trusted_receipt_present: true,
    trusted_for_transport_contract: true,
    can_sync_events: false,
    can_use_relay_as_trusted_device: false,
    relay_enforcement_still_required: true,
    ingestion_validation_still_required_per_event: true,
    no_local_storage_write: true,
    no_event_sync: true,
    no_relay_enforcement: true,
    accepted_at: new Date().toISOString(),
  };

  return {
    ok: true,
    code: 'SCANOPS_TRUSTED_DEVICE_STATE_PROJECTED',
    receipt_validation: receiptValidation,
    local_state: localState,
    guardrails,
  };
}

function assertProjected(result, label) {
  assertSubset(
    result,
    {
      ok: true,
      code: 'SCANOPS_TRUSTED_DEVICE_STATE_PROJECTED',
      receipt_validation: { ok: true, code: 'APPROVED_RECEIPT_PROJECTABLE' },
      local_state: {
        local_pairing_state: 'READY_FOR_BRIDGE_TRANSPORT_PENDING_RELAY',
        trusted_receipt_present: true,
        trusted_for_transport_contract: true,
        can_sync_events: false,
        can_use_relay_as_trusted_device: false,
        relay_enforcement_still_required: true,
        ingestion_validation_still_required_per_event: true,
        no_local_storage_write: true,
        no_event_sync: true,
        no_relay_enforcement: true,
      },
      guardrails,
    },
    label
  );
  assertEqual(result.local_state.source_device_id, localDeviceProfile.source_device_id, `${label}.source_device_id`);
  assertEqual(result.local_state.inventory_device_ref, approvedReceipt.linked_device_ref, `${label}.inventory_device_ref`);
  assertEqual(result.local_state.environment, localDeviceProfile.environment, `${label}.environment`);
  assertEqual(result.local_state.store_id, localDeviceProfile.store_id, `${label}.store_id`);
  assertEqual(result.local_state.inventory_instance_id, localDeviceProfile.inventory_instance_id, `${label}.inventory_instance_id`);
}

function main() {
  assertNoForbiddenOperationalCalls();

  const projected = projectTrustedDeviceState(approvedReceipt, localDeviceProfile);
  assertProjected(projected, 'trusted device state projection');

  assertSubset(
    projectTrustedDeviceState({ ...approvedReceipt, trusted: false }, localDeviceProfile),
    { ok: false, code: 'APPROVED_RECEIPT_MUST_BE_TRUSTED', local_state: null, guardrails },
    'untrusted receipt rejected'
  );

  assertSubset(
    projectTrustedDeviceState({ ...approvedReceipt, device_status: 'PENDING', pairing_status: 'PENDING_APPROVAL' }, localDeviceProfile),
    { ok: false, code: 'APPROVED_RECEIPT_NOT_TRUSTED', local_state: null, guardrails },
    'pending receipt rejected'
  );

  assertSubset(
    projectTrustedDeviceState({ ...approvedReceipt, linked_device_ref: null }, localDeviceProfile),
    { ok: false, code: 'APPROVED_RECEIPT_LINK_REQUIRED', local_state: null, guardrails },
    'missing linked device ref rejected'
  );

  assertSubset(
    projectTrustedDeviceState({ ...approvedReceipt, reviewed_by: null }, localDeviceProfile),
    { ok: false, code: 'APPROVED_RECEIPT_REVIEW_MISSING', local_state: null, guardrails },
    'missing reviewer rejected'
  );

  assertSubset(
    projectTrustedDeviceState({ ...approvedReceipt, source_device_id: 'SCANOPS-OTHER' }, localDeviceProfile),
    { ok: false, code: 'PAIRING_DEVICE_MISMATCH', local_state: null, guardrails },
    'device mismatch rejected'
  );

  assertSubset(
    projectTrustedDeviceState({ ...approvedReceipt, environment: 'TRAINING' }, localDeviceProfile),
    { ok: false, code: 'PAIRING_ENVIRONMENT_MISMATCH', local_state: null, guardrails },
    'environment mismatch rejected'
  );

  const mutationGuardrails = assertNoScanOpsInventoryBridgePairingOperationalMutation();
  assertSubset(mutationGuardrails, {
    no_event_sync: true,
    no_scanops_sync_mutation: true,
    no_relay_enforcement: true,
    no_entity_writes: true,
    ingestion_validation_still_required_per_event: true,
    base44_cloud_relay_not_lan_bridge: true,
  }, 'mutation guardrails');

  console.log('ScanOps trusted device state projection validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps trusted device state projection validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
