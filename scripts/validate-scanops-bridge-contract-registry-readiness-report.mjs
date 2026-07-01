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

const reportTypes = read('src/bridge/contracts/bridgeContractRegistryReadinessReportTypes.ts');
const report = read('src/bridge/contracts/bridgeContractRegistryReadinessReport.ts');
const registry = read('src/bridge/contracts/bridgeContractRegistry.ts');
const accessors = read('src/bridge/contracts/bridgeContractRegistryAccessors.ts');
const safetyReport = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');

assertIncludes(reportTypes, 'export type BridgeContractRegistryReadinessReportPhase = "32.C4";', 'readiness report must identify Phase 32 C4');
assertIncludes(reportTypes, 'readonly contractCount: 10;', 'readiness report totals must type contractCount as 10');
assertIncludes(reportTypes, 'readonly activeContracts: 0;', 'readiness report totals must type activeContracts as zero');
assertIncludes(reportTypes, 'readonly enabledContracts: 0;', 'readiness report totals must type enabledContracts as zero');
assertIncludes(reportTypes, 'readonly executableContracts: 0;', 'readiness report totals must type executableContracts as zero');
assertIncludes(reportTypes, 'readonly operationalContracts: 0;', 'readiness report totals must type operationalContracts as zero');
assertIncludes(reportTypes, 'readonly registryEnabled: false;', 'readiness report must type registryEnabled as false');
assertIncludes(reportTypes, 'readonly registryExecutionAllowed: false;', 'readiness report must type registryExecutionAllowed as false');
assertIncludes(reportTypes, 'readonly registryActive: false;', 'readiness report must type registryActive as false');
assertIncludes(reportTypes, 'readonly allContractsDisabled: true;', 'readiness report must type allContractsDisabled as true');
assertIncludes(reportTypes, 'readonly operationalCapabilityActive: false;', 'readiness report must type operationalCapabilityActive as false');
assertIncludes(reportTypes, 'readonly safeToRunOperationalBridge: false;', 'readiness report must type safeToRunOperationalBridge as false');
assertIncludes(reportTypes, 'readonly readyForActivation: false;', 'readiness report must type readyForActivation as false');

assertIncludes(report, 'createBridgeContractRegistryReadinessReport', 'readiness report factory must exist');
assertIncludes(report, 'createBridgeRuntimeSafetyReport()', 'readiness report must use runtime safety report');
assertIncludes(report, 'getBridgeContractRegistrySnapshot()', 'readiness report must use registry accessor');
assertIncludes(report, 'runtimeSafetyReport.safeToRunOperationalBridge !== false', 'readiness report must reject runtime activation drift');
assertIncludes(report, 'registrySnapshot.safeToRunOperationalBridge !== false', 'readiness report must reject registry activation drift');
assertIncludes(report, 'registrySnapshot.enabled !== false', 'readiness report must reject enabled registry drift');
assertIncludes(report, 'registrySnapshot.executionAllowed !== false', 'readiness report must reject executable registry drift');
assertIncludes(report, 'registrySnapshot.registryActive !== false', 'readiness report must reject active registry drift');
assertIncludes(report, 'registrySnapshot.allContractsDisabled !== true', 'readiness report must reject disabled contract drift');
assertIncludes(report, 'registrySnapshot.activeContracts !== 0', 'readiness report must reject active contract drift');
assertIncludes(report, 'registrySnapshot.contracts.length !== 10', 'readiness report must require ten contracts');
assertIncludes(report, 'enabledContracts.length !== 0', 'readiness report must reject enabled contracts');
assertIncludes(report, 'executableContracts.length !== 0', 'readiness report must reject executable contracts');
assertIncludes(report, 'operationalContracts.length !== 0', 'readiness report must reject operational contracts');
assertIncludes(report, 'phase: "32.C4"', 'readiness report must return Phase 32 C4');
assertIncludes(report, 'contractCount: 10', 'readiness report must return contractCount=10');
assertIncludes(report, 'activeContracts: 0', 'readiness report must return activeContracts=0');
assertIncludes(report, 'enabledContracts: 0', 'readiness report must return enabledContracts=0');
assertIncludes(report, 'executableContracts: 0', 'readiness report must return executableContracts=0');
assertIncludes(report, 'operationalContracts: 0', 'readiness report must return operationalContracts=0');
assertIncludes(report, 'registryEnabled: false', 'readiness report must return registryEnabled=false');
assertIncludes(report, 'registryExecutionAllowed: false', 'readiness report must return registryExecutionAllowed=false');
assertIncludes(report, 'registryActive: false', 'readiness report must return registryActive=false');
assertIncludes(report, 'allContractsDisabled: true', 'readiness report must return allContractsDisabled=true');
assertIncludes(report, 'operationalCapabilityActive: false', 'readiness report must return operationalCapabilityActive=false');
assertIncludes(report, 'safeToRunOperationalBridge: false', 'readiness report must return safeToRunOperationalBridge=false');
assertIncludes(report, 'readyForActivation: false', 'readiness report must return readyForActivation=false');
assertIncludes(report, 'does not activate the bridge', 'readiness report reason must state no activation');

assertIncludes(registry, 'phase: "32.C1"', 'readiness report must build on C1 registry');
assertIncludes(accessors, 'return false;', 'readiness report must build on disabled C2 accessors');
assertIncludes(safetyReport, 'safeToRunOperationalBridge: false;', 'runtime safety report must keep operational bridge unsafe');

for (const forbidden of [
  'registryEnabled: true',
  'registryExecutionAllowed: true',
  'registryActive: true',
  'operationalCapabilityActive: true',
  'safeToRunOperationalBridge: true',
  'readyForActivation: true',
  'fetch(',
  'WebSocket',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
]) {
  assertNotIncludes(reportTypes, forbidden, `readiness report types must not contain ${forbidden}`);
  assertNotIncludes(report, forbidden, `readiness report implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 C4 validates the contract registry readiness report remains read-only and inactive.');
