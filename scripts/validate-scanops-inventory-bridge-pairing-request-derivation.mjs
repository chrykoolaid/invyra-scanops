import fs from 'node:fs';
import path from 'node:path';
import {
  assertNoScanOpsInventoryBridgePairingOperationalMutation,
  buildScanOpsInventoryBridgePairingRequest,
  getScanOpsInventoryBridgePairingOfferSafeSummary,
  getScanOpsInventoryBridgePairingRequestSafeSummary,
  validateScanOpsInventoryBridgePairingOffer,
  validateScanOpsInventoryBridgePairingRequest,
} from '../src/lib/inventoryBridge/pairingContract.js';

const root = process.cwd();
const contractPath = 'src/lib/inventoryBridge/pairingContract.js';

const inventoryPairingOfferFixture = Object.freeze({
  bridge_protocol_version: '1.0.0',
  pairing_contract_version: '1.0.0',
  bridge_name: 'Invyra Inventory Bridge',
  bridge_version: '1.0.0',
  pairing_method: 'QR_CODE',
  environment: 'LIVE',
  issued_at: new Date(Date.now() - 60 * 1000).toISOString(),
  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  transport_mode: 'PROTOTYPE_CLOUD_RELAY',
  pairing_ref: 'PAIR-REF-001',
  challenge_ref: 'CHALLENGE-REF-001',
  prototype_transport: true,
  transport_note: 'Base44 prototype cloud relay — not a local LAN bridge.',
});

const localDeviceProfile = Object.freeze({
  source_device_id: 'SCANOPS-DEVICE-001',
  device_name: 'ScanOps Handheld 001',
  device_type: 'HANDHELD_SCANNER',
  source_user_id: 'staff-001',
  source_user_role: 'Staff',
});

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
  const ownSource = stripComments(readRequired('scripts/validate-scanops-inventory-bridge-pairing-request-derivation.mjs'));
  const contractSource = stripComments(readRequired(contractPath));

  for (const forbidden of forbiddenOperationalCalls) {
    assert(!forbidden.pattern.test(ownSource), `validator contains forbidden operational call: ${forbidden.label}`);
    assert(!forbidden.pattern.test(contractSource), `${contractPath} contains forbidden operational call: ${forbidden.label}`);
  }
}

function deriveRequestFromOffer(offer, deviceProfile) {
  const offerValidation = validateScanOpsInventoryBridgePairingOffer(offer, {
    environment: offer.environment,
  });

  if (!offerValidation.ok) {
    return {
      ok: false,
      code: 'PAIRING_OFFER_INVALID',
      offer_validation: offerValidation,
      request: null,
    };
  }

  const request = buildScanOpsInventoryBridgePairingRequest({
    bridge_protocol_version: offer.bridge_protocol_version,
    pairing_contract_version: offer.pairing_contract_version,
    source_device_id: deviceProfile.source_device_id,
    device_name: deviceProfile.device_name,
    device_type: deviceProfile.device_type,
    source_user_id: deviceProfile.source_user_id,
    source_user_role: deviceProfile.source_user_role,
    store_id: offer.store_id,
    inventory_instance_id: offer.inventory_instance_id,
    environment: offer.environment,
    pairing_method: offer.pairing_method,
    pairing_ref: offer.pairing_ref,
    challenge_ref: offer.challenge_ref,
  });

  const requestValidation = validateScanOpsInventoryBridgePairingRequest(request, {
    environment: offer.environment,
  });

  return {
    ok: requestValidation.ok,
    code: requestValidation.ok ? 'PAIRING_REQUEST_DERIVED' : 'PAIRING_REQUEST_DERIVATION_INVALID',
    offer_validation: offerValidation,
    request_validation: requestValidation,
    request,
  };
}

function assertDerivedRequestMatchesOffer(offer, request) {
  const fields = [
    'bridge_protocol_version',
    'pairing_contract_version',
    'environment',
    'store_id',
    'inventory_instance_id',
    'pairing_method',
    'pairing_ref',
    'challenge_ref',
  ];

  for (const field of fields) {
    assertEqual(request[field], offer[field], `derived request ${field}`);
  }

  assertEqual(request.source_system, 'scanops', 'derived request source_system');
  assertEqual(request.source_device_id, localDeviceProfile.source_device_id, 'derived request source_device_id');
  assertEqual(request.device_name, localDeviceProfile.device_name, 'derived request device_name');
  assertEqual(request.device_type, localDeviceProfile.device_type, 'derived request device_type');
  assertEqual(request.prototype_transport, true, 'derived request prototype_transport');
  assert(
    request.transport_note.includes('not a local LAN bridge'),
    'derived request must preserve Base44 cloud relay guardrail.'
  );
}

function main() {
  assertNoForbiddenOperationalCalls();

  const derived = deriveRequestFromOffer(inventoryPairingOfferFixture, localDeviceProfile);
  assertObjectSubset(
    derived,
    {
      ok: true,
      code: 'PAIRING_REQUEST_DERIVED',
      offer_validation: {
        ok: true,
        code: 'PAIRING_OFFER_VALID',
      },
      request_validation: {
        ok: true,
        code: 'PAIRING_REQUEST_VALID',
      },
    },
    'derived ScanOps pairing request'
  );

  assertDerivedRequestMatchesOffer(inventoryPairingOfferFixture, derived.request);

  const expiredOffer = {
    ...inventoryPairingOfferFixture,
    issued_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  };
  assertObjectSubset(
    deriveRequestFromOffer(expiredOffer, localDeviceProfile),
    {
      ok: false,
      code: 'PAIRING_OFFER_INVALID',
      offer_validation: {
        ok: false,
        code: 'PAIRING_OFFER_EXPIRED',
      },
      request: null,
    },
    'expired offer cannot derive request'
  );

  const missingDeviceProfile = {
    ...localDeviceProfile,
    source_device_id: null,
  };
  assertObjectSubset(
    deriveRequestFromOffer(inventoryPairingOfferFixture, missingDeviceProfile),
    {
      ok: false,
      code: 'PAIRING_REQUEST_DERIVATION_INVALID',
      request_validation: {
        ok: false,
        code: 'PAIRING_REQUEST_INVALID',
      },
    },
    'missing source device cannot derive valid request'
  );

  const offerSummary = getScanOpsInventoryBridgePairingOfferSafeSummary(inventoryPairingOfferFixture);
  const requestSummary = getScanOpsInventoryBridgePairingRequestSafeSummary(derived.request);
  assert(offerSummary.pairing_ref !== inventoryPairingOfferFixture.pairing_ref, 'offer summary must redact pairing_ref.');
  assert(requestSummary.pairing_ref !== derived.request.pairing_ref, 'request summary must redact pairing_ref.');
  assert(offerSummary.challenge_ref !== inventoryPairingOfferFixture.challenge_ref, 'offer summary must redact challenge_ref.');
  assert(requestSummary.challenge_ref !== derived.request.challenge_ref, 'request summary must redact challenge_ref.');

  const mutationGuardrails = assertNoScanOpsInventoryBridgePairingOperationalMutation();
  assertObjectSubset(mutationGuardrails, requiredGuardrails, 'mutation guardrails');

  console.log('ScanOps pairing request derivation validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps pairing request derivation validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
