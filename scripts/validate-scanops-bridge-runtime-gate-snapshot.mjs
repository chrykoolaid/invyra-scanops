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

const runtimeTypes = read('src/bridge/runtime/bridgeRuntimeTypes.ts');
const runtimeReadiness = read('src/bridge/runtime/bridgeRuntimeReadiness.ts');
const runtime = read('src/bridge/runtime/bridgeRuntime.ts');
const runtimeConfigTypes = read('src/bridge/runtime/bridgeRuntimeConfigTypes.ts');
const featureGateTypes = read('src/bridge/runtime/bridgeFeatureGateTypes.ts');
const featureGates = read('src/bridge/runtime/bridgeFeatureGates.ts');

assertIncludes(runtimeTypes, 'export const BRIDGE_RUNTIME_VERSION = "32.A4.0";', 'runtime version must remain 32.A4.0');
assertIncludes(runtimeTypes, 'export const BRIDGE_ALLOWED_ENVIRONMENTS = ["TEST"] as const;', 'runtime must only allow TEST environment');
assertIncludes(runtimeTypes, 'operationalCapabilityActive: false;', 'readiness type must expose inactive operational capability flag');
assertIncludes(runtimeTypes, 'runtimeConfig: BridgeRuntimeConfig;', 'runtime snapshot/readiness must include runtimeConfig');
assertIncludes(runtimeTypes, 'featureGates: BridgeFeatureGateRegistry;', 'runtime snapshot/readiness must include featureGates');
assertNotIncludes(runtimeTypes, '"LIVE"] as const', 'runtime types must not allow LIVE environment');
assertNotIncludes(runtimeTypes, 'communicationActive: true', 'runtime types must not allow active communication');
assertNotIncludes(runtimeTypes, 'persistenceActive: true', 'runtime types must not allow active persistence');
assertNotIncludes(runtimeTypes, 'mutationActive: true', 'runtime types must not allow active mutation');

assertIncludes(runtimeReadiness, 'communicationActive: false,', 'readiness must keep communication inactive');
assertIncludes(runtimeReadiness, 'persistenceActive: false,', 'readiness must keep persistence inactive');
assertIncludes(runtimeReadiness, 'mutationActive: false,', 'readiness must keep mutation inactive');
assertIncludes(runtimeReadiness, 'operationalCapabilityActive: false,', 'readiness must keep operational capability inactive');
assertIncludes(runtimeReadiness, 'runtimeConfig,', 'readiness must include runtimeConfig snapshot');
assertIncludes(runtimeReadiness, 'featureGates,', 'readiness must include feature gate snapshot');
assertIncludes(runtimeReadiness, 'networkSocketsBlocked: true,', 'readiness guardrails must block network sockets');
assertIncludes(runtimeReadiness, 'discoveryBlocked: true,', 'readiness guardrails must block discovery');
assertIncludes(runtimeReadiness, 'pairingBlocked: true,', 'readiness guardrails must block pairing');
assertIncludes(runtimeReadiness, 'queueProcessingBlocked: true,', 'readiness guardrails must block queue processing');
assertIncludes(runtimeReadiness, 'inboxProcessingBlocked: true,', 'readiness guardrails must block inbox processing');
assertIncludes(runtimeReadiness, 'inventoryMutationBlocked: true,', 'readiness guardrails must block Inventory mutation');
assertIncludes(runtimeReadiness, 'scanOpsMutationBlocked: true,', 'readiness guardrails must block ScanOps mutation');
assertNotIncludes(runtimeReadiness, 'communicationActive: true', 'readiness must not activate communication');
assertNotIncludes(runtimeReadiness, 'persistenceActive: true', 'readiness must not activate persistence');
assertNotIncludes(runtimeReadiness, 'mutationActive: true', 'readiness must not activate mutation');
assertNotIncludes(runtimeReadiness, 'operationalCapabilityActive: true', 'readiness must not activate operational capability');

assertIncludes(runtime, 'createBridgeRuntimeConfig()', 'runtime must create disabled runtime config snapshot');
assertIncludes(runtime, 'createBridgeFeatureGateRegistry()', 'runtime must create disabled feature gate snapshot');
assertIncludes(runtime, 'only TEST mode is allowed in Phase 32-A4', 'runtime must reject non-TEST startup');
assertIncludes(runtime, 'operational feature gates remain disabled', 'runtime ready reason must preserve disabled gates');
assertIncludes(runtime, 'runtimeConfig,', 'runtime snapshot must include runtimeConfig');
assertIncludes(runtime, 'featureGates,', 'runtime snapshot must include featureGates');
assertNotIncludes(runtime, 'fetch(', 'runtime must not open transport calls');
assertNotIncludes(runtime, 'localStorage.', 'runtime must not persist to localStorage');
assertNotIncludes(runtime, 'sessionStorage.', 'runtime must not persist to sessionStorage');
assertNotIncludes(runtime, 'indexedDB', 'runtime must not use indexedDB');

assertIncludes(runtimeConfigTypes, 'export type BridgeEnvironment = "TEST";', 'runtime config must remain TEST-only');
assertIncludes(runtimeConfigTypes, 'allowNetwork: false;', 'runtime config must block network');
assertIncludes(runtimeConfigTypes, 'allowDiscovery: false;', 'runtime config must block discovery');
assertIncludes(runtimeConfigTypes, 'allowPairing: false;', 'runtime config must block pairing');
assertIncludes(runtimeConfigTypes, 'allowTransport: false;', 'runtime config must block transport');
assertIncludes(runtimeConfigTypes, 'allowPersistence: false;', 'runtime config must block persistence');
assertIncludes(runtimeConfigTypes, 'allowMutation: false;', 'runtime config must block mutation');

for (const gateName of [
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
]) {
  assertIncludes(featureGateTypes, `| "${gateName}"`, `feature gate type must include ${gateName}`);
  assertIncludes(featureGates, `name: "${gateName}"`, `feature gate registry must include ${gateName}`);
}

const enabledGateMatches = featureGates.match(/enabled:\s*true/g) ?? [];
const operationalCapabilityMatches = featureGates.match(/operationalCapability:\s*true/g) ?? [];

if (enabledGateMatches.length > 0) {
  errors.push('feature gates must not contain enabled: true');
}

if (operationalCapabilityMatches.length > 0) {
  errors.push('feature gates must not contain operationalCapability: true');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 A5 validates that the runtime gate snapshot remains TEST-only, inactive, and non-operational.');
