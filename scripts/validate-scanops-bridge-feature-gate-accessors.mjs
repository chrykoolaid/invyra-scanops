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

const accessors = read('src/bridge/runtime/bridgeFeatureGateAccessors.ts');
const gateTypes = read('src/bridge/runtime/bridgeFeatureGateTypes.ts');
const gates = read('src/bridge/runtime/bridgeFeatureGates.ts');
const validation = read('src/bridge/runtime/bridgeFeatureGateValidation.ts');

const expectedGateNames = [
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

for (const gateName of expectedGateNames) {
  assertIncludes(gateTypes, `| "${gateName}"`, `gate type must include ${gateName}`);
  assertIncludes(gates, `name: "${gateName}"`, `default registry must include ${gateName}`);
}

assertIncludes(accessors, 'export interface BridgeFeatureGateAccessResult', 'access result contract must be exported');
assertIncludes(accessors, 'enabled: false;', 'access result must type enabled as false');
assertIncludes(accessors, 'operationalCapability: false;', 'access result must type operationalCapability as false');
assertIncludes(accessors, 'blocked: true;', 'access result must type blocked as true');
assertIncludes(accessors, 'getBridgeFeatureGate(', 'single gate accessor must be exported');
assertIncludes(accessors, 'isBridgeFeatureGateEnabled(', 'enabled accessor must be exported');
assertIncludes(accessors, 'getBridgeFeatureGateAccessResult(', 'single access result accessor must be exported');
assertIncludes(accessors, 'getAllBridgeFeatureGateAccessResults(', 'all access results accessor must be exported');
assertIncludes(accessors, 'validateBridgeFeatureGateRegistry(registry);', 'accessors must validate registry before reading');
assertIncludes(accessors, 'return false;', 'enabled accessor must always return false');
assertIncludes(accessors, 'blocked: true,', 'access results must remain blocked');
assertIncludes(accessors, 'disabled in Phase 32 A6', 'access result reason must preserve disabled phase message');

assertNotIncludes(accessors, 'enabled: true', 'accessors must not enable any feature gate');
assertNotIncludes(accessors, 'operationalCapability: true', 'accessors must not expose operational capability');
assertNotIncludes(accessors, 'blocked: false', 'accessors must not unblock feature gates');
assertNotIncludes(accessors, 'fetch(', 'accessors must not perform transport calls');
assertNotIncludes(accessors, 'localStorage.', 'accessors must not persist to localStorage');
assertNotIncludes(accessors, 'sessionStorage.', 'accessors must not persist to sessionStorage');
assertNotIncludes(accessors, 'indexedDB', 'accessors must not use indexedDB');

assertIncludes(validation, 'gate.enabled !== false', 'validation must reject enabled gates');
assertIncludes(validation, 'gate.operationalCapability !== false', 'validation must reject operational capability');

const enabledMatches = gates.match(/enabled:\s*true/g) ?? [];
const operationalMatches = gates.match(/operationalCapability:\s*true/g) ?? [];

if (enabledMatches.length > 0) {
  errors.push('default registry must not contain enabled: true');
}

if (operationalMatches.length > 0) {
  errors.push('default registry must not contain operationalCapability: true');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 A6 validates disabled-only feature gate accessors with no operational activation.');
