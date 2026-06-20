import fs from 'node:fs';
import path from 'node:path';
import {
  assertNoScanOpsInventoryBridgeRelayReadinessPreflightOperationalMutation,
  getScanOpsInventoryBridgeRelayReadinessPreflightSafeSummary,
  projectScanOpsInventoryBridgeRelayReadinessPreflight,
} from '../src/lib/inventoryBridge/relayReadinessPreflightProjection.js';

const root = process.cwd();
const projectionPath = 'src/lib/inventoryBridge/relayReadinessPreflightProjection.js';

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
  projected_at: '2026-06-20T00:00:00.000Z',
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
  trusted_receipt_present: true,
  trusted_for_transport_contract: true,
  relay_admission_evidence_present: true,
  can_sync_events: false,
  relay_transport_started: false,
  event_transport_enabled: false,
  event_ingestion_allowed: false,
});

const guardrails = Object.freeze({
  scanops_relay_readiness_preflight_projection_only: true,
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
  const ownSource = stripComments(readRequired('scripts/validate-scanops-inventory-bridge-relay-readiness-preflight-projection.mjs'));
  const projectionSource = stripComments(readRequired(projectionPath));

  for (const forbidden of forbiddenOperationalCalls) {
    assert(!forbidden.pattern.test(ownSource), `validator contains forbidden operational call: ${forbidden.label}`);
    assert(!forbidden.pattern.test(projectionSource), `${projectionPath} contains forbidden operational call: ${forbidden.label}`);
  }
}

function project(overrides = {}) {
  return projectScanOpsInventoryBridgeRelayReadinessPreflight(
    {
      local_trusted_state: overrides.local_trusted_state ?? localTrustedState,
      relay_admission_evidence: overrides.relay_admission_evidence ?? relayAdmissionEvidence,
      relay_enforcement_applied: overrides.relay_enforcement_applied ?? false,
    },
    { projected_at: '2026-06-20T01:00:00.000Z' }
  );
}

function assertProjected(result, label) {
  assertSubset(
    result,
    {
      ok: true,
      schema_version: '1.0.0',
      phase: '1D-D-W',
      contract_version: '1.0.0',
      bridge_protocol_version: '1.0.0',
      code: 'SCANOPS_RELAY_READINESS_PREFLIGHT_PROJECTED',
      status: 'READY_PENDING_RELAY_ENFORCEMENT',
      source_device_id: localTrustedState.source_device_id,
      environment: localTrustedState.environment,
      store_id: localTrustedState.store_id,
      inventory_instance_id: localTrustedState.inventory_instance_id,
      relay_instance_ref: relayAdmissionEvidence.relay_instance_ref,
      local_trusted_state_present: true,
      trusted_receipt_present: true,
      relay_admission_evidence_present: true,
      relay_admission_evidence_accepted: true,
      relay_admission_state: 'RELAY_ADMISSION_EVIDENCE_ACCEPTED_PENDING_ENFORCEMENT',
      local_pairing_state: 'READY_FOR_BRIDGE_TRANSPORT_PENDING_RELAY',
      trusted_for_transport_contract: true,
      can_start_relay_transport: false,
      can_enable_event_transport: false,
      can_sync_events: false,
      can_call_inventory_ingestion: false,
      can_write_event_outbox: false,
      can_write_local_storage: false,
      can_mutate_inventory: false,
      can_mutate_stock: false,
      can_mutate_prices: false,
      can_mutate_pos_orders_forecast: false,
      can_mutate_item_master: false,
      relay_enforcement_still_required: true,
      relay_transport_started: false,
      event_transport_enabled: false,
      event_ingestion_allowed: false,
      ingestion_validation_still_required_per_event: true,
      evidence_projection_only: true,
      guardrails,
    },
    label
  );
  assert(Array.isArray(result.blockers), `${label}.blockers should be an array`);
  assertEqual(result.blockers.length, 0, `${label}.blockers.length`);
}

function assertBlocked(result, expectedCode, label) {
  assertSubset(
    result,
    {
      ok: false,
      phase: '1D-D-W',
      code: expectedCode,
      status: 'BLOCKED',
      relay_enforcement_still_required: true,
      can_start_relay_transport: false,
      can_enable_event_transport: false,
      can_sync_events: false,
      can_call_inventory_ingestion: false,
      event_ingestion_allowed: false,
      ingestion_validation_still_required_per_event: true,
      evidence_projection_only: true,
      guardrails,
    },
    label
  );
  assert(Array.isArray(result.blockers), `${label}.blockers should be an array`);
  assert(result.blockers.length > 0, `${label}.blockers should not be empty`);
}

function main() {
  assertNoForbiddenOperationalCalls();

  const projected = project();
  assertProjected(projected, 'relay readiness preflight projection');

  const summary = getScanOpsInventoryBridgeRelayReadinessPreflightSafeSummary(projected);
  assertSubset(
    summary,
    {
      phase: '1D-D-W',
      code: 'SCANOPS_RELAY_READINESS_PREFLIGHT_PROJECTED',
      status: 'READY_PENDING_RELAY_ENFORCEMENT',
      source_device_id: localTrustedState.source_device_id,
      relay_instance_ref: relayAdmissionEvidence.relay_instance_ref,
      local_trusted_state_present: true,
      relay_admission_evidence_present: true,
      relay_admission_evidence_accepted: true,
      relay_enforcement_still_required: true,
      can_start_relay_transport: false,
      can_enable_event_transport: false,
      can_sync_events: false,
      can_call_inventory_ingestion: false,
      event_ingestion_allowed: false,
      ingestion_validation_still_required_per_event: true,
      evidence_projection_only: true,
      blocker_count: 0,
    },
    'safe summary'
  );

  assertBlocked(project({ local_trusted_state: { ...localTrustedState, source_device_id: null } }), 'LOCAL_TRUSTED_DEVICE_STATE_REQUIRED', 'missing local state blocked');
  assertBlocked(project({ relay_admission_evidence: null }), 'RELAY_ADMISSION_EVIDENCE_REQUIRED', 'missing evidence blocked');
  assertBlocked(project({ relay_admission_evidence: { ...relayAdmissionEvidence, allowed_for_bridge_transport: false } }), 'RELAY_ADMISSION_EVIDENCE_NOT_ACCEPTED', 'unaccepted evidence blocked');
  assertBlocked(project({ relay_enforcement_applied: true }), 'RELAY_ENFORCEMENT_ALREADY_APPLIED', 'relay enforcement applied blocked');
  assertBlocked(project({ local_trusted_state: { ...localTrustedState, relay_transport_started: true } }), 'RELAY_TRANSPORT_ALREADY_STARTED', 'relay transport already started blocked');
  assertBlocked(project({ local_trusted_state: { ...localTrustedState, event_transport_enabled: true } }), 'EVENT_TRANSPORT_ALREADY_ENABLED', 'event transport already enabled blocked');
  assertBlocked(project({ local_trusted_state: { ...localTrustedState, can_sync_events: true } }), 'EVENT_SYNC_ALREADY_ENABLED', 'event sync already enabled blocked');
  assertBlocked(project({ local_trusted_state: { ...localTrustedState, event_ingestion_allowed: true } }), 'EVENT_INGESTION_ALREADY_ALLOWED', 'event ingestion already allowed blocked');

  const mutationGuardrails = assertNoScanOpsInventoryBridgeRelayReadinessPreflightOperationalMutation();
  assertSubset(mutationGuardrails, guardrails, 'mutation guardrails');

  console.log('ScanOps relay readiness preflight projection validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps relay readiness preflight projection validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
