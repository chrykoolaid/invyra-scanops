import fs from 'node:fs';
import path from 'node:path';
import {
  acceptScanOpsInventoryBridgeRelayAdmissionEvidence,
  assertNoScanOpsInventoryBridgeRelayAdmissionAcceptanceOperationalMutation,
  getScanOpsInventoryBridgeRelayAdmissionEvidenceSafeSummary,
  validateScanOpsInventoryBridgeRelayAdmissionEvidence,
} from '../src/lib/inventoryBridge/relayAdmissionEvidenceContract.js';

const root = process.cwd();
const contractPath = 'src/lib/inventoryBridge/relayAdmissionEvidenceContract.js';

const relayAdmissionEvidence = Object.freeze({
  schema_version: '1.0.0',
  phase: '1D-D-U',
  bridge_protocol_version: '1.0.0',
  pairing_contract_version: '1.0.0',
  source_system: 'scanops',
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  relay_instance_ref: 'BASE44-CLOUD-RELAY-PROTOTYPE',
  relay_decision_code: 'DEVICE_TRUSTED',
  relay_decision_message: 'Device is trusted for transport.',
  allowed_for_bridge_transport: true,
  relay_enforcement_applied: false,
  relay_transport_started: false,
  event_transport_enabled: false,
  event_ingestion_allowed: false,
  ingestion_validation_still_required_per_event: true,
  inventory_mutation_allowed: false,
  stock_mutation_allowed: false,
  price_mutation_allowed: false,
  pos_order_forecast_mutation_allowed: false,
  item_master_mutation_allowed: false,
  evidence_projection_only: true,
  projected_at: new Date().toISOString(),
  device_summary: {
    device_id: 'SCANOPS-DEVICE-001',
    device_name: 'ScanOps Handheld 001',
    device_type: 'HANDHELD_SCANNER',
    environment: 'LIVE',
    store_id: 'STORE-001',
    inventory_instance_id: 'INV-INSTANCE-001',
    status: 'TRUSTED',
    trusted: true,
  },
});

const localTrustedState = Object.freeze({
  source_system: 'scanops',
  source_device_id: 'SCANOPS-DEVICE-001',
  device_name: 'ScanOps Handheld 001',
  device_type: 'HANDHELD_SCANNER',
  app_instance_id: 'SCANOPS-APP-INSTANCE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  inventory_device_ref: 'InventoryBridgeDevice:SCANOPS-DEVICE-001',
  pairing_receipt_id: 'PAIRING-RECEIPT-APPROVED-001',
  local_pairing_state: 'READY_FOR_BRIDGE_TRANSPORT_PENDING_RELAY',
});

const guardrails = Object.freeze({
  scanops_relay_admission_acceptance_projection_only: true,
  local_validator_only: true,
  no_local_storage_write: true,
  no_event_outbox_write: true,
  no_event_sync: true,
  no_event_transport: true,
  no_relay_enforcement: true,
  no_relay_transport: true,
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
  const ownSource = stripComments(readRequired('scripts/validate-scanops-inventory-bridge-relay-admission-evidence-acceptance.mjs'));
  const contractSource = stripComments(readRequired(contractPath));

  for (const forbidden of forbiddenOperationalCalls) {
    assert(!forbidden.pattern.test(ownSource), `validator contains forbidden operational call: ${forbidden.label}`);
    assert(!forbidden.pattern.test(contractSource), `${contractPath} contains forbidden operational call: ${forbidden.label}`);
  }
}

function assertAccepted(result, label) {
  assertSubset(
    result,
    {
      ok: true,
      code: 'SCANOPS_RELAY_ADMISSION_EVIDENCE_ACCEPTED',
      validation: { ok: true, code: 'RELAY_ADMISSION_EVIDENCE_VALID' },
      local_state: {
        source_device_id: localTrustedState.source_device_id,
        environment: localTrustedState.environment,
        store_id: localTrustedState.store_id,
        inventory_instance_id: localTrustedState.inventory_instance_id,
        relay_instance_ref: relayAdmissionEvidence.relay_instance_ref,
        relay_admission_evidence_phase: '1D-D-U',
        relay_admission_state: 'RELAY_ADMISSION_EVIDENCE_ACCEPTED_PENDING_ENFORCEMENT',
        local_pairing_state: 'READY_FOR_BRIDGE_TRANSPORT_PENDING_RELAY',
        trusted_receipt_present: true,
        relay_admission_evidence_present: true,
        trusted_for_transport_contract: true,
        can_sync_events: false,
        can_use_relay_as_trusted_device: false,
        relay_enforcement_still_required: true,
        relay_transport_started: false,
        event_transport_enabled: false,
        event_ingestion_allowed: false,
        ingestion_validation_still_required_per_event: true,
        no_local_storage_write: true,
        no_event_sync: true,
        no_event_transport: true,
        no_relay_enforcement: true,
      },
      guardrails,
    },
    label
  );
  assert(result.local_state.accepted_at, `${label}.accepted_at required`);
}

function assertRejected(evidence, expectedCode, label) {
  assertSubset(
    acceptScanOpsInventoryBridgeRelayAdmissionEvidence(evidence, localTrustedState),
    { ok: false, code: expectedCode, local_state: null, guardrails },
    label
  );
}

function main() {
  assertNoForbiddenOperationalCalls();

  const validation = validateScanOpsInventoryBridgeRelayAdmissionEvidence(relayAdmissionEvidence, localTrustedState);
  assertSubset(validation, { ok: true, code: 'RELAY_ADMISSION_EVIDENCE_VALID' }, 'evidence validation');

  const accepted = acceptScanOpsInventoryBridgeRelayAdmissionEvidence(relayAdmissionEvidence, localTrustedState);
  assertAccepted(accepted, 'relay admission evidence acceptance');

  const summary = getScanOpsInventoryBridgeRelayAdmissionEvidenceSafeSummary(relayAdmissionEvidence);
  assertSubset(
    summary,
    {
      phase: '1D-D-U',
      source_device_id: localTrustedState.source_device_id,
      relay_decision_code: 'DEVICE_TRUSTED',
      allowed_for_bridge_transport: true,
      relay_enforcement_applied: false,
      relay_transport_started: false,
      event_transport_enabled: false,
      event_ingestion_allowed: false,
      ingestion_validation_still_required_per_event: true,
      evidence_projection_only: true,
    },
    'safe summary'
  );

  assertRejected({ ...relayAdmissionEvidence, allowed_for_bridge_transport: false }, 'RELAY_ADMISSION_EVIDENCE_NOT_ALLOWED', 'not allowed evidence rejected');
  assertRejected({ ...relayAdmissionEvidence, relay_decision_code: 'DEVICE_PENDING_APPROVAL' }, 'RELAY_ADMISSION_DECISION_NOT_TRUSTED', 'non-trusted decision rejected');
  assertRejected({ ...relayAdmissionEvidence, source_device_id: 'SCANOPS-OTHER' }, 'PAIRING_DEVICE_MISMATCH', 'device mismatch rejected');
  assertRejected({ ...relayAdmissionEvidence, environment: 'TRAINING' }, 'PAIRING_ENVIRONMENT_MISMATCH', 'environment mismatch rejected');
  assertRejected({ ...relayAdmissionEvidence, store_id: 'STORE-OTHER' }, 'PAIRING_STORE_MISMATCH', 'store mismatch rejected');
  assertRejected({ ...relayAdmissionEvidence, inventory_instance_id: 'INV-OTHER' }, 'PAIRING_INSTANCE_MISMATCH', 'inventory instance mismatch rejected');
  assertRejected({ ...relayAdmissionEvidence, bridge_protocol_version: '9.9.9' }, 'PAIRING_PROTOCOL_MISMATCH', 'protocol mismatch rejected');
  assertRejected({ ...relayAdmissionEvidence, relay_enforcement_applied: true }, 'RELAY_ENFORCEMENT_ALREADY_APPLIED', 'already enforced evidence rejected');
  assertRejected({ ...relayAdmissionEvidence, relay_transport_started: true }, 'RELAY_TRANSPORT_ALREADY_STARTED', 'relay transport started evidence rejected');
  assertRejected({ ...relayAdmissionEvidence, event_transport_enabled: true }, 'EVENT_TRANSPORT_ALREADY_ENABLED', 'event transport enabled evidence rejected');
  assertRejected({ ...relayAdmissionEvidence, event_ingestion_allowed: true }, 'EVENT_INGESTION_ALREADY_ALLOWED', 'event ingestion allowed evidence rejected');

  const mutationGuardrails = assertNoScanOpsInventoryBridgeRelayAdmissionAcceptanceOperationalMutation();
  assertSubset(mutationGuardrails, guardrails, 'mutation guardrails');

  console.log('ScanOps relay admission evidence acceptance validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps relay admission evidence acceptance validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
