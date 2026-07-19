#!/usr/bin/env node
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}

const inventoryRoot = process.env.INVENTORY_REPO_PATH
  ? join(process.cwd(), process.env.INVENTORY_REPO_PATH)
  : join(process.cwd(), 'inventory-repo');
const inventoryRuntimeUrl = pathToFileURL(join(
  inventoryRoot,
  'src/inventory-bridge/runtimeHost/v1/index.js',
)).href;
const { createInventoryBridgePilotRuntimeHostV1 } = await import(inventoryRuntimeUrl);

const storage = new Map();
const storageAdapter = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
globalThis.window = {
  location: { protocol: 'http:', hostname: '127.0.0.1' },
  sessionStorage: storageAdapter,
  localStorage: storageAdapter,
  setTimeout,
  clearTimeout,
};

const {
  clearLiveConnection,
  getLiveConnectionProfile,
  pairInventoryDesktop,
  runLiveBridgeHealthTest,
} = await import('../src/lib/scanOpsLiveConnectivity.js');

const runtime = createInventoryBridgePilotRuntimeHostV1({
  controlHost: '127.0.0.1',
  controlPort: 0,
  allowEphemeralPortsForTest: true,
});

let stopped = null;
try {
  const control = await runtime.startControl();
  check('inventory_control_started', control.ok === true, control);

  const configured = runtime.configure({
    environment: 'TRAINING',
    bindHost: '127.0.0.1',
    advertisedHost: '127.0.0.1',
    publicPort: 0,
    storeId: 'store-phase39-0b-cross',
    inventoryInstanceId: 'inventory-phase39-0b-cross',
  });
  check('inventory_training_configuration_accepted', configured.ok === true, configured);

  const bridge = await runtime.startBridge();
  check('inventory_public_bridge_started', bridge.ok === true && bridge.status.state === 'ONLINE', bridge);
  const publicPort = bridge.status.bridge.address?.port;
  check('inventory_public_port_assigned', Number.isInteger(publicPort) && publicPort > 0, publicPort);

  const offer = runtime.createPairingOffer();
  check('inventory_pairing_code_created', offer.ok === true && /^\d{6}$/.test(offer.setupCode), offer);

  const session = {
    deviceId: 'SCANOPS-HH-P39-0B-CROSS',
    sessionId: 'SCANOPS-SESSION-P39-0B-CROSS',
    storeId: 'store-phase39-0b-cross',
  };
  const pairing = await pairInventoryDesktop({
    host: '127.0.0.1',
    port: publicPort,
    setupCode: offer.setupCode,
    session,
  });
  check('actual_cross_repository_pairing_succeeded', pairing.ok === true && pairing.status === 'PAIRED', pairing);

  const profile = getLiveConnectionProfile();
  check('scanops_received_inventory_scope',
    profile?.storeId === 'store-phase39-0b-cross'
      && profile?.inventoryInstanceId === 'inventory-phase39-0b-cross'
      && profile?.environment === 'TRAINING',
    profile,
  );
  check('scanops_trust_reference_is_ephemeral',
    /^[a-f0-9]{64}$/i.test(profile?.trustReference || '')
      && Date.parse(profile?.trustExpiresAt || '') > Date.now(),
    profile,
  );

  const health = await runLiveBridgeHealthTest(session);
  check('actual_http_health_connection_succeeded', health.ok === true && health.status === 'CONNECTED', health);
  check('canonical_health_admission_accepted',
    health.admissionStatus === 'ACCEPTED' && health.applicationStatus === 'NOT_APPLICABLE',
    health,
  );
  check('canonical_receipt_returned_to_scanops',
    typeof health.receiptId === 'string' && health.receiptId.startsWith('receipt:health:'),
    health,
  );

  const inventoryStatus = runtime.getStatus();
  check('inventory_observed_trusted_device',
    inventoryStatus.trustedDevices.some((device) => device.deviceId === session.deviceId),
    inventoryStatus.trustedDevices,
  );
  check('inventory_observed_one_accepted_health', inventoryStatus.metrics.healthAccepted === 1, inventoryStatus.metrics);
  check('inventory_observed_zero_health_rejections', inventoryStatus.metrics.healthRejected === 0, inventoryStatus.metrics);
  check('zero_prohibited_inventory_mutations', [
    inventoryStatus.inventoryMutationAttempted,
    inventoryStatus.stockMutationAttempted,
    inventoryStatus.ledgerMutationAttempted,
    inventoryStatus.itemMasterMutationAttempted,
    inventoryStatus.purchaseOrderMutationAttempted,
    inventoryStatus.receivingOperationAttempted,
  ].every((value) => value === false), inventoryStatus);
  check('zero_scanops_mutations',
    health.inventoryMutationAttempted === false && health.scanOpsMutationAttempted === false,
    health,
  );

  clearLiveConnection();
  check('scanops_temporary_pairing_clearable', getLiveConnectionProfile() === null);
} finally {
  stopped = await runtime.stopControl();
}
check('inventory_runtime_stopped_safely', stopped?.ok === true, stopped);

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '39-0B',
  certification: 'CROSS_REPOSITORY_CONNECTION',
  repositories: [
    'chrykoolaid/invyra-base44',
    'chrykoolaid/invyra-scanops',
  ],
  commits: {
    inventory: process.env.INVENTORY_PHASE39_0B_SHA || null,
    scanOps: process.env.GITHUB_SHA || null,
  },
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  operatorConnectionReadiness: failures.length === 0 ? 'READY_FOR_LOCAL_ACCEPTANCE_TEST' : 'FAIL',
  receivingIntegrationAuthorized: false,
  tests: checks,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
