import fs from 'node:fs';
import path from 'node:path';
import {
  acceptScanOpsRelayEnforcementCandidate,
  assertNoScanOpsRelayEnforcementCandidateAcceptanceOperationalMutation,
  getScanOpsRelayEnforcementCandidateAcceptanceSafeSummary,
  validateScanOpsRelayEnforcementCandidate,
} from '../src/lib/inventoryBridge/relayEnforcementCandidateAcceptance.js';

const root = process.cwd();
const acceptancePath = 'src/lib/inventoryBridge/relayEnforcementCandidateAcceptance.js';

const inventoryRelayEnforcementCandidate = Object.freeze({
  status: 'RELAY_ENFORCEMENT_CANDIDATE_PROJECTED_PENDING_ENFORCEMENT',
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  relay_instance_ref: 'BASE44-CLOUD-RELAY-PROTOTYPE',
  scanops_preflight_phase: '1D-D-W',
  scanops_preflight_projected_at: '2026-06-20T01:00:00.000Z',
  relay_readiness_preflight_accepted: true,
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
  accepted_at: '2026-06-20T02:00:00.000Z',
});

const localScope = Object.freeze({
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  relay_instance_ref: 'BASE44-CLOUD-RELAY-PROTOTYPE',
});

const guardrails = Object.freeze({
  scanops_relay_enforcement_candidate_acceptance_projection_only: true,
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
  const ownSource = stripComments(readRequired('scripts/validate-scanops-inventory-bridge-relay-enforcement-candidate-acceptance.mjs'));
  const acceptanceSource = stripComments(readRequired(acceptancePath));

  for (const forbidden of forbiddenOperationalCalls) {
    assert(!forbidden.pattern.test(ownSource), `validator contains forbidden operational call: ${forbidden.label}`);
    assert(!forbidden.pattern.test(acceptanceSource), `${acceptancePath} contains forbidden operational call: ${forbidden.label}`);
  }
}

function accept(overrides = {}) {
  return acceptScanOpsRelayEnforcementCandidate(
    overrides.candidate ?? inventoryRelayEnforcementCandidate,
    overrides.localScope ?? localScope,
    { accepted_at: '2026-06-20T03:00:00.000Z' }
  );
}

function assertAccepted(result, label) {
  assertSubset(
    result,
    {
      ok: true,
      code: 'SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTED',
      validation: { ok: true, code: 'RELAY_ENFORCEMENT_CANDIDATE_VALID' },
      local_state: {
        status: 'RELAY_ENFORCEMENT_CANDIDATE_ACCEPTED_PENDING_FUTURE_RELAY_ENFORCEMENT',
        source_device_id: localScope.source_device_id,
        environment: localScope.environment,
        store_id: localScope.store_id,
        inventory_instance_id: localScope.inventory_instance_id,
        relay_instance_ref: localScope.relay_instance_ref,
        inventory_candidate_status: 'RELAY_ENFORCEMENT_CANDIDATE_PROJECTED_PENDING_ENFORCEMENT',
        scanops_preflight_phase: '1D-D-W',
        relay_readiness_preflight_accepted: true,
        relay_enforcement_candidate_accepted: true,
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
        accepted_at: '2026-06-20T03:00:00.000Z',
      },
      guardrails,
    },
    label
  );
}

function assertRejected(candidate, expectedCode, label) {
  assertSubset(
    accept({ candidate }),
    {
      ok: false,
      code: expectedCode,
      local_state: {
        status: 'RELAY_ENFORCEMENT_CANDIDATE_REJECTED',
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

  const validation = validateScanOpsRelayEnforcementCandidate(inventoryRelayEnforcementCandidate, localScope);
  assertSubset(validation, { ok: true, code: 'RELAY_ENFORCEMENT_CANDIDATE_VALID' }, 'candidate validation');

  const accepted = accept();
  assertAccepted(accepted, 'candidate acceptance');

  const summary = getScanOpsRelayEnforcementCandidateAcceptanceSafeSummary(accepted);
  assertSubset(
    summary,
    {
      ok: true,
      code: 'SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTED',
      local_status: 'RELAY_ENFORCEMENT_CANDIDATE_ACCEPTED_PENDING_FUTURE_RELAY_ENFORCEMENT',
      source_device_id: localScope.source_device_id,
      environment: localScope.environment,
      store_id: localScope.store_id,
      inventory_instance_id: localScope.inventory_instance_id,
      relay_instance_ref: localScope.relay_instance_ref,
      inventory_candidate_status: 'RELAY_ENFORCEMENT_CANDIDATE_PROJECTED_PENDING_ENFORCEMENT',
      scanops_preflight_phase: '1D-D-W',
      relay_readiness_preflight_accepted: true,
      relay_enforcement_candidate_accepted: true,
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

  assertRejected({ ...inventoryRelayEnforcementCandidate, status: 'RELAY_ENFORCEMENT_CANDIDATE_BLOCKED' }, 'RELAY_ENFORCEMENT_CANDIDATE_STATUS_INVALID', 'invalid status rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, source_device_id: 'SCANOPS-OTHER' }, 'RELAY_ENFORCEMENT_CANDIDATE_DEVICE_MISMATCH', 'device mismatch rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, environment: 'TRAINING' }, 'RELAY_ENFORCEMENT_CANDIDATE_ENVIRONMENT_MISMATCH', 'environment mismatch rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, store_id: 'STORE-OTHER' }, 'RELAY_ENFORCEMENT_CANDIDATE_STORE_MISMATCH', 'store mismatch rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, inventory_instance_id: 'INV-OTHER' }, 'RELAY_ENFORCEMENT_CANDIDATE_INSTANCE_MISMATCH', 'inventory instance mismatch rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, scanops_preflight_phase: '1D-D-V' }, 'RELAY_ENFORCEMENT_CANDIDATE_PHASE_MISMATCH', 'phase mismatch rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, relay_readiness_preflight_accepted: false }, 'RELAY_ENFORCEMENT_CANDIDATE_STATUS_INVALID', 'unaccepted readiness rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, relay_enforcement_allowed: true }, 'RELAY_ENFORCEMENT_ALREADY_ALLOWED', 'relay enforcement allowed rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, relay_enforcement_still_required: false }, 'RELAY_ENFORCEMENT_ALREADY_ALLOWED', 'relay enforcement no longer required rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, relay_transport_allowed: true }, 'RELAY_TRANSPORT_ALREADY_ALLOWED', 'relay transport allowed rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, event_transport_allowed: true }, 'EVENT_TRANSPORT_ALREADY_ALLOWED', 'event transport allowed rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, event_sync_allowed: true }, 'EVENT_SYNC_ALREADY_ALLOWED', 'event sync allowed rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, event_ingestion_allowed: true }, 'EVENT_INGESTION_ALREADY_ALLOWED', 'event ingestion allowed rejected');
  assertRejected({ ...inventoryRelayEnforcementCandidate, inventory_mutation_allowed: true }, 'INVENTORY_MUTATION_ALREADY_ALLOWED', 'inventory mutation allowed rejected');

  const mutationGuardrails = assertNoScanOpsRelayEnforcementCandidateAcceptanceOperationalMutation();
  assertSubset(mutationGuardrails, guardrails, 'mutation guardrails');

  console.log('ScanOps relay enforcement candidate acceptance validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps relay enforcement candidate acceptance validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
