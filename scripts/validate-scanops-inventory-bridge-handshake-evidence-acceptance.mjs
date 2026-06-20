import fs from 'node:fs';
import path from 'node:path';
import {
  acceptScanOpsHandshakeEvidence,
  assertNoScanOpsHandshakeEvidenceAcceptanceOperationalMutation,
  getScanOpsHandshakeEvidenceAcceptanceSafeSummary,
  validateScanOpsHandshakeEvidence,
} from '../src/lib/inventoryBridge/handshakeEvidenceAcceptance.js';

const root = process.cwd();
const acceptancePath = 'src/lib/inventoryBridge/handshakeEvidenceAcceptance.js';

const inventoryHandshakeEvidence = Object.freeze({
  ok: true,
  schema_version: '1.0.0',
  phase: '1D-D-Z',
  contract_version: '1.0.0',
  bridge_protocol_version: '1.0.0',
  code: 'INVENTORY_RELAY_HANDSHAKE_EVIDENCE_PROJECTED',
  status: 'RELAY_HANDSHAKE_EVIDENCE_CLOSED_PENDING_FUTURE_ENFORCEMENT',
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  relay_instance_ref: 'BASE44-CLOUD-RELAY-PROTOTYPE',
  inventory_candidate_status: 'RELAY_ENFORCEMENT_CANDIDATE_PROJECTED_PENDING_ENFORCEMENT',
  scanops_preflight_phase: '1D-D-W',
  scanops_candidate_acceptance_status: 'RELAY_ENFORCEMENT_CANDIDATE_ACCEPTED_PENDING_FUTURE_RELAY_ENFORCEMENT',
  relay_readiness_preflight_accepted: true,
  relay_enforcement_candidate_accepted: true,
  handshake_evidence_closed: true,
  relay_enforcement_allowed: false,
  relay_transport_allowed: false,
  event_transport_allowed: false,
  event_sync_allowed: false,
  event_ingestion_allowed: false,
  inventory_mutation_allowed: false,
  stock_mutation_allowed: false,
  price_mutation_allowed: false,
  pos_order_forecast_mutation_allowed: false,
  item_master_mutation_allowed: false,
  relay_enforcement_still_required: true,
  ingestion_validation_still_required_per_event: true,
  evidence_projection_only: true,
  scanops_candidate_accepted_at: '2026-06-20T03:00:00.000Z',
  projected_at: '2026-06-20T04:00:00.000Z',
});

const localScope = Object.freeze({
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  relay_instance_ref: 'BASE44-CLOUD-RELAY-PROTOTYPE',
});

const guardrails = Object.freeze({
  scanops_handshake_evidence_acceptance_projection_only: true,
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
  const ownSource = stripComments(readRequired('scripts/validate-scanops-inventory-bridge-handshake-evidence-acceptance.mjs'));
  const acceptanceSource = stripComments(readRequired(acceptancePath));

  for (const forbidden of forbiddenOperationalCalls) {
    assert(!forbidden.pattern.test(ownSource), `validator contains forbidden operational call: ${forbidden.label}`);
    assert(!forbidden.pattern.test(acceptanceSource), `${acceptancePath} contains forbidden operational call: ${forbidden.label}`);
  }
}

function accept(overrides = {}) {
  return acceptScanOpsHandshakeEvidence(
    overrides.evidence ?? inventoryHandshakeEvidence,
    overrides.localScope ?? localScope,
    { accepted_at: '2026-06-20T05:00:00.000Z' }
  );
}

function assertAccepted(result, label) {
  assertSubset(
    result,
    {
      ok: true,
      code: 'SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTED',
      validation: { ok: true, code: 'HANDSHAKE_EVIDENCE_VALID' },
      local_state: {
        status: 'HANDSHAKE_EVIDENCE_ACCEPTED_PENDING_FUTURE_RELAY_ENFORCEMENT',
        source_device_id: localScope.source_device_id,
        environment: localScope.environment,
        store_id: localScope.store_id,
        inventory_instance_id: localScope.inventory_instance_id,
        relay_instance_ref: localScope.relay_instance_ref,
        inventory_handshake_status: 'RELAY_HANDSHAKE_EVIDENCE_CLOSED_PENDING_FUTURE_ENFORCEMENT',
        inventory_handshake_phase: '1D-D-Z',
        scanops_preflight_phase: '1D-D-W',
        scanops_candidate_acceptance_status: 'RELAY_ENFORCEMENT_CANDIDATE_ACCEPTED_PENDING_FUTURE_RELAY_ENFORCEMENT',
        handshake_evidence_closed: true,
        relay_enforcement_allowed: false,
        relay_transport_allowed: false,
        event_transport_allowed: false,
        event_sync_allowed: false,
        event_ingestion_allowed: false,
        can_sync_events: false,
        can_start_relay_transport: false,
        can_enable_event_transport: false,
        can_call_inventory_ingestion: false,
        can_write_event_outbox: false,
        can_write_local_storage: false,
        relay_enforcement_still_required: true,
        ingestion_validation_still_required_per_event: true,
        evidence_projection_only: true,
        accepted_at: '2026-06-20T05:00:00.000Z',
      },
      guardrails,
    },
    label
  );
}

function assertRejected(evidence, expectedCode, label) {
  assertSubset(
    accept({ evidence }),
    {
      ok: false,
      code: expectedCode,
      local_state: {
        status: 'HANDSHAKE_EVIDENCE_REJECTED',
        relay_enforcement_allowed: false,
        relay_transport_allowed: false,
        event_transport_allowed: false,
        event_sync_allowed: false,
        event_ingestion_allowed: false,
      },
      guardrails,
    },
    label
  );
}

function main() {
  assertNoForbiddenOperationalCalls();

  const validation = validateScanOpsHandshakeEvidence(inventoryHandshakeEvidence, localScope);
  assertSubset(validation, { ok: true, code: 'HANDSHAKE_EVIDENCE_VALID' }, 'handshake evidence validation');

  const accepted = accept();
  assertAccepted(accepted, 'handshake evidence acceptance');

  const summary = getScanOpsHandshakeEvidenceAcceptanceSafeSummary(accepted);
  assertSubset(
    summary,
    {
      ok: true,
      code: 'SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTED',
      local_status: 'HANDSHAKE_EVIDENCE_ACCEPTED_PENDING_FUTURE_RELAY_ENFORCEMENT',
      source_device_id: localScope.source_device_id,
      environment: localScope.environment,
      store_id: localScope.store_id,
      inventory_instance_id: localScope.inventory_instance_id,
      relay_instance_ref: localScope.relay_instance_ref,
      inventory_handshake_status: 'RELAY_HANDSHAKE_EVIDENCE_CLOSED_PENDING_FUTURE_ENFORCEMENT',
      inventory_handshake_phase: '1D-D-Z',
      handshake_evidence_closed: true,
      relay_enforcement_allowed: false,
      relay_transport_allowed: false,
      event_transport_allowed: false,
      event_sync_allowed: false,
      event_ingestion_allowed: false,
      relay_enforcement_still_required: true,
      ingestion_validation_still_required_per_event: true,
      evidence_projection_only: true,
    },
    'safe summary'
  );

  assertRejected({ ...inventoryHandshakeEvidence, phase: '1D-D-X' }, 'HANDSHAKE_EVIDENCE_PHASE_MISMATCH', 'phase mismatch rejected');
  assertRejected({ ...inventoryHandshakeEvidence, status: 'RELAY_HANDSHAKE_EVIDENCE_BLOCKED' }, 'HANDSHAKE_EVIDENCE_STATUS_INVALID', 'invalid status rejected');
  assertRejected({ ...inventoryHandshakeEvidence, code: 'INVENTORY_RELAY_HANDSHAKE_EVIDENCE_BLOCKED' }, 'HANDSHAKE_EVIDENCE_STATUS_INVALID', 'invalid code rejected');
  assertRejected({ ...inventoryHandshakeEvidence, source_device_id: 'SCANOPS-OTHER' }, 'HANDSHAKE_EVIDENCE_DEVICE_MISMATCH', 'device mismatch rejected');
  assertRejected({ ...inventoryHandshakeEvidence, environment: 'TRAINING' }, 'HANDSHAKE_EVIDENCE_ENVIRONMENT_MISMATCH', 'environment mismatch rejected');
  assertRejected({ ...inventoryHandshakeEvidence, store_id: 'STORE-OTHER' }, 'HANDSHAKE_EVIDENCE_STORE_MISMATCH', 'store mismatch rejected');
  assertRejected({ ...inventoryHandshakeEvidence, inventory_instance_id: 'INV-OTHER' }, 'HANDSHAKE_EVIDENCE_INSTANCE_MISMATCH', 'instance mismatch rejected');
  assertRejected({ ...inventoryHandshakeEvidence, handshake_evidence_closed: false }, 'HANDSHAKE_EVIDENCE_NOT_CLOSED', 'handshake not closed rejected');
  assertRejected({ ...inventoryHandshakeEvidence, relay_enforcement_allowed: true }, 'RELAY_ENFORCEMENT_ALREADY_ALLOWED', 'relay enforcement allowed rejected');
  assertRejected({ ...inventoryHandshakeEvidence, relay_enforcement_still_required: false }, 'RELAY_ENFORCEMENT_ALREADY_ALLOWED', 'relay enforcement no longer required rejected');
  assertRejected({ ...inventoryHandshakeEvidence, relay_transport_allowed: true }, 'RELAY_TRANSPORT_ALREADY_ALLOWED', 'relay transport allowed rejected');
  assertRejected({ ...inventoryHandshakeEvidence, event_transport_allowed: true }, 'EVENT_TRANSPORT_ALREADY_ALLOWED', 'event transport allowed rejected');
  assertRejected({ ...inventoryHandshakeEvidence, event_sync_allowed: true }, 'EVENT_SYNC_ALREADY_ALLOWED', 'event sync allowed rejected');
  assertRejected({ ...inventoryHandshakeEvidence, event_ingestion_allowed: true }, 'EVENT_INGESTION_ALREADY_ALLOWED', 'event ingestion allowed rejected');
  assertRejected({ ...inventoryHandshakeEvidence, inventory_mutation_allowed: true }, 'INVENTORY_MUTATION_ALREADY_ALLOWED', 'inventory mutation allowed rejected');

  const mutationGuardrails = assertNoScanOpsHandshakeEvidenceAcceptanceOperationalMutation();
  assertSubset(mutationGuardrails, guardrails, 'mutation guardrails');

  console.log('ScanOps handshake evidence acceptance validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps handshake evidence acceptance validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
