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

const guard = read('src/bridge/runtime/bridgeRuntimeCapabilityGuard.ts');
const accessors = read('src/bridge/runtime/bridgeFeatureGateAccessors.ts');
const gates = read('src/bridge/runtime/bridgeFeatureGates.ts');

const expectedCapabilities = [
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

for (const capability of expectedCapabilities) {
  assertIncludes(guard, `| "${capability}"`, `capability type must include ${capability}`);
  assertIncludes(guard, `${capability}: "${capability}"`, `capability map must bind ${capability} to its gate`);
  assertIncludes(gates, `name: "${capability}"`, `default gates must include ${capability}`);
}

assertIncludes(guard, 'export interface BridgeRuntimeCapabilityDecision', 'capability decision contract must be exported');
assertIncludes(guard, 'allowed: false;', 'capability decision must type allowed as false');
assertIncludes(guard, 'blocked: true;', 'capability decision must type blocked as true');
assertIncludes(guard, 'communicationActive: false;', 'capability decision must keep communication inactive');
assertIncludes(guard, 'persistenceActive: false;', 'capability decision must keep persistence inactive');
assertIncludes(guard, 'mutationActive: false;', 'capability decision must keep mutation inactive');
assertIncludes(guard, 'operationalCapabilityActive: false;', 'capability decision must keep operational capability inactive');
assertIncludes(guard, 'evaluateBridgeRuntimeCapability(', 'single capability evaluator must be exported');
assertIncludes(guard, 'evaluateAllBridgeRuntimeCapabilities(', 'all capability evaluator must be exported');
assertIncludes(guard, 'assertBridgeRuntimeCapabilityBlocked(', 'blocked assertion helper must be exported');
assertIncludes(guard, 'getBridgeFeatureGateAccessResult(requiredGate, registry)', 'capability guard must use feature gate accessors');
assertIncludes(guard, 'allowed: false,', 'capability evaluator must return allowed=false');
assertIncludes(guard, 'blocked: true,', 'capability evaluator must return blocked=true');
assertIncludes(guard, 'blocked by disabled gate', 'capability reason must explain disabled gate block');
assertIncludes(guard, 'attempted to become operational', 'assertion helper must reject operational drift');

assertIncludes(accessors, 'enabled: false;', 'feature gate accessors must type enabled as false');
assertIncludes(accessors, 'blocked: true;', 'feature gate accessors must type blocked as true');
assertIncludes(accessors, 'operationalCapability: false;', 'feature gate accessors must type operational capability as false');

assertNotIncludes(guard, 'allowed: true', 'capability guard must not allow any capability');
assertNotIncludes(guard, 'blocked: false', 'capability guard must not unblock any capability');
assertNotIncludes(guard, 'communicationActive: true', 'capability guard must not activate communication');
assertNotIncludes(guard, 'persistenceActive: true', 'capability guard must not activate persistence');
assertNotIncludes(guard, 'mutationActive: true', 'capability guard must not activate mutation');
assertNotIncludes(guard, 'operationalCapabilityActive: true', 'capability guard must not activate operational capability');
assertNotIncludes(guard, 'fetch(', 'capability guard must not perform transport calls');
assertNotIncludes(guard, 'localStorage.', 'capability guard must not persist to localStorage');
assertNotIncludes(guard, 'sessionStorage.', 'capability guard must not persist to sessionStorage');
assertNotIncludes(guard, 'indexedDB', 'capability guard must not use indexedDB');
assertNotIncludes(guard, 'writeFile', 'capability guard must not write files');
assertNotIncludes(guard, 'appendFile', 'capability guard must not append files');

const enabledMatches = gates.match(/enabled:\s*true/g) ?? [];
const operationalMatches = gates.match(/operationalCapability:\s*true/g) ?? [];

if (enabledMatches.length > 0) {
  errors.push('default gates must not contain enabled: true');
}

if (operationalMatches.length > 0) {
  errors.push('default gates must not contain operationalCapability: true');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 A7 validates the runtime capability guard remains fully blocked and non-operational.');
