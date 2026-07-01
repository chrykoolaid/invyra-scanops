import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const errors = [];
const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertIncludes(content, expected, message) {
  if (!content.includes(expected)) {
    errors.push(message);
  }
}

function assertNotIncludes(content, forbidden, message) {
  if (content.includes(forbidden)) {
    errors.push(message);
  }
}

const registryTypes = read('src/bridge/contracts/bridgeContractRegistryTypes.ts');
const registry = read('src/bridge/contracts/bridgeContractRegistry.ts');
const safetyReport = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');

const expectedContracts = [
  'discovery',
  'qrPairing',
  'trustedDeviceRegistry',
  'transport',
  'outboundQueue',
  'inboundInbox',
  'receipts',
  'acknowledgements',
  'diagnostics',
  'recovery',
];

assertIncludes(registryTypes, 'export type BridgeContractRegistryPhase = "32.C1";', 'contract registry must identify Phase 32 C1');
assertIncludes(registryTypes, 'readonly enabled: false;', 'contract registry must type enabled as false');
assertIncludes(registryTypes, 'readonly executionAllowed: false;', 'contract registry must type executionAllowed as false');
assertIncludes(registryTypes, 'readonly registryActive: false;', 'contract registry must type registryActive as false');
assertIncludes(registryTypes, 'readonly allContractsDisabled: true;', 'contract registry must type allContractsDisabled as true');
assertIncludes(registryTypes, 'readonly activeContracts: 0;', 'contract registry must type activeContracts as zero');
assertIncludes(registryTypes, 'readonly operationalCapabilityActive: false;', 'contract registry must type operational capability as false');
assertIncludes(registryTypes, 'readonly safeToRunOperationalBridge: false;', 'contract registry must type safeToRunOperationalBridge as false');

assertIncludes(registry, 'createBridgeContractRegistrySnapshot', 'contract registry snapshot factory must exist');
assertIncludes(registry, 'createBridgeRuntimeSafetyReport()', 'contract registry must use runtime safety report');
assertIncludes(registry, 'safeToRunOperationalBridge !== false', 'contract registry must reject operational bridge drift');
assertIncludes(registry, 'contracts.length !== 10', 'contract registry must expect ten contract snapshots');
assertIncludes(registry, 'activeContracts.length > 0', 'contract registry must reject active contracts');
assertIncludes(registry, 'phase: "32.C1"', 'contract registry must return Phase 32 C1');
assertIncludes(registry, 'systemOfRecord: "Inventory Desktop"', 'contract registry must preserve Inventory Desktop system of record');
assertIncludes(registry, 'operationalLayer: "ScanOps"', 'contract registry must preserve ScanOps operational layer');
assertIncludes(registry, 'enabled: false', 'contract registry must return enabled=false');
assertIncludes(registry, 'executionAllowed: false', 'contract registry must return executionAllowed=false');
assertIncludes(registry, 'registryActive: false', 'contract registry must return registryActive=false');
assertIncludes(registry, 'allContractsDisabled: true', 'contract registry must return allContractsDisabled=true');
assertIncludes(registry, 'activeContracts: 0', 'contract registry must return activeContracts=0');
assertIncludes(registry, 'operationalCapabilityActive: false', 'contract registry must return operationalCapabilityActive=false');
assertIncludes(registry, 'safeToRunOperationalBridge: false', 'contract registry must return safeToRunOperationalBridge=false');
assertIncludes(registry, 'performs no bridge execution', 'contract registry reason must state no execution');

for (const contractName of expectedContracts) {
  assertIncludes(registryTypes, `| "${contractName}"`, `registry type must include ${contractName}`);
  assertIncludes(registry, `name: "${contractName}"`, `registry source must include ${contractName}`);
}

for (const factoryName of [
  'createBridgeDiscoveryContractSnapshot',
  'createBridgeQrPairingContractSnapshot',
  'createBridgeTrustedDeviceRegistryContractSnapshot',
  'createBridgeTransportContractSnapshot',
  'createBridgeOutboundQueueContractSnapshot',
  'createBridgeInboundInboxContractSnapshot',
  'createBridgeReceiptContractSnapshot',
  'createBridgeAcknowledgementContractSnapshot',
  'createBridgeDiagnosticsContractSnapshot',
  'createBridgeRecoveryContractSnapshot',
]) {
  assertIncludes(registry, factoryName, `registry must import and use ${factoryName}`);
}

assertIncludes(safetyReport, 'safeToRunOperationalBridge: false;', 'runtime safety report must keep operational bridge unsafe');

for (const forbidden of [
  'enabled: true',
  'executionAllowed: true',
  'registryActive: true',
  'operationalCapabilityActive: true',
  'safeToRunOperationalBridge: true',
  'fetch(',
  'WebSocket',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
]) {
  assertNotIncludes(registryTypes, forbidden, `contract registry types must not contain ${forbidden}`);
  assertNotIncludes(registry, forbidden, `contract registry implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 C1 validates the contract registry snapshot remains read-only and disabled.');
