import fs from 'node:fs';
import path from 'node:path';
import {
  assertNoScanOpsInventoryBridgePairingOperationalMutation,
  getScanOpsInventoryBridgePairingOfferSafeSummary,
  validateScanOpsInventoryBridgePairingOffer,
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
  bridge_host: null,
  bridge_port: null,
  bridge_base_url: null,
  pairing_ref: 'PAIR-REF-001',
  challenge_ref: 'CHALLENGE-REF-001',
  prototype_transport: true,
  transport_note: 'Base44 prototype cloud relay — not a local LAN bridge.',
});

const requiredOfferFields = Object.freeze([
  'bridge_protocol_version',
  'pairing_contract_version',
  'pairing_method',
  'environment',
  'issued_at',
  'expires_at',
  'store_id',
  'inventory_instance_id',
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
  const ownSource = stripComments(readRequired('scripts/validate-scanops-inventory-bridge-pairing-offer-fixture.mjs'));
  const contractSource = stripComments(readRequired(contractPath));

  for (const forbidden of forbiddenOperationalCalls) {
    assert(!forbidden.pattern.test(ownSource), `validator contains forbidden operational call: ${forbidden.label}`);
    assert(!forbidden.pattern.test(contractSource), `${contractPath} contains forbidden operational call: ${forbidden.label}`);
  }
}

function assertFixtureShape() {
  for (const field of requiredOfferFields) {
    assert(inventoryPairingOfferFixture[field], `Inventory pairing offer fixture missing required field: ${field}`);
  }

  assertEqual(inventoryPairingOfferFixture.bridge_protocol_version, '1.0.0', 'fixture.bridge_protocol_version');
  assertEqual(inventoryPairingOfferFixture.pairing_contract_version, '1.0.0', 'fixture.pairing_contract_version');
  assertEqual(inventoryPairingOfferFixture.environment, 'LIVE', 'fixture.environment');
  assertEqual(inventoryPairingOfferFixture.pairing_method, 'QR_CODE', 'fixture.pairing_method');
  assertEqual(inventoryPairingOfferFixture.transport_mode, 'PROTOTYPE_CLOUD_RELAY', 'fixture.transport_mode');
  assertEqual(inventoryPairingOfferFixture.prototype_transport, true, 'fixture.prototype_transport');
  assert(
    inventoryPairingOfferFixture.transport_note.includes('not a local LAN bridge'),
    'Inventory offer fixture must preserve Base44 cloud relay guardrail.'
  );
}

function main() {
  assertNoForbiddenOperationalCalls();
  assertFixtureShape();

  const validation = validateScanOpsInventoryBridgePairingOffer(inventoryPairingOfferFixture, {
    environment: 'LIVE',
  });

  assertObjectSubset(
    validation,
    {
      ok: true,
      code: 'PAIRING_OFFER_VALID',
    },
    'ScanOps validation of Inventory pairing offer fixture'
  );

  const summary = getScanOpsInventoryBridgePairingOfferSafeSummary(inventoryPairingOfferFixture);
  assert(summary.pairing_ref !== inventoryPairingOfferFixture.pairing_ref, 'safe summary must redact pairing_ref.');
  assert(summary.challenge_ref !== inventoryPairingOfferFixture.challenge_ref, 'safe summary must redact challenge_ref.');

  const mismatchValidation = validateScanOpsInventoryBridgePairingOffer(
    {
      ...inventoryPairingOfferFixture,
      environment: 'TRAINING',
    },
    { environment: 'LIVE' }
  );

  assertObjectSubset(
    mismatchValidation,
    {
      ok: false,
      code: 'PAIRING_ENVIRONMENT_MISMATCH',
    },
    'ScanOps rejects Inventory offer environment mismatch'
  );

  const expiredValidation = validateScanOpsInventoryBridgePairingOffer({
    ...inventoryPairingOfferFixture,
    issued_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  });

  assertObjectSubset(
    expiredValidation,
    {
      ok: false,
      code: 'PAIRING_OFFER_EXPIRED',
    },
    'ScanOps rejects expired Inventory pairing offer'
  );

  const protocolValidation = validateScanOpsInventoryBridgePairingOffer({
    ...inventoryPairingOfferFixture,
    bridge_protocol_version: '0.9.0',
  });

  assertObjectSubset(
    protocolValidation,
    {
      ok: false,
      code: 'PAIRING_PROTOCOL_MISMATCH',
    },
    'ScanOps rejects Inventory offer protocol mismatch'
  );

  const mutationGuardrails = assertNoScanOpsInventoryBridgePairingOperationalMutation();
  assertObjectSubset(mutationGuardrails, requiredGuardrails, 'mutation guardrails');

  console.log('ScanOps acceptance of Inventory pairing offer fixture PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps acceptance of Inventory pairing offer fixture FAIL');
  console.error(error);
  process.exitCode = 1;
}
