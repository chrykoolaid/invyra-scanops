#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}
function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const reportPath = 'docs/bridge/PHASE_39_0A_RUNTIME_RECONCILIATION.md';
const evidencePath = 'docs/bridge/phase39-0a-runtime-reconciliation.json';
const report = read(reportPath);
const evidence = JSON.parse(read(evidencePath));
const packageJson = JSON.parse(read('package.json'));
const syncHandoff = read('src/pages/SyncHandoff.jsx');
const connectivity = read('src/lib/scanOpsConnectivity.js');
const phase35Transport = read('src/inventory-bridge/testTransport/v1/scanOpsTestTransportClientV1.js');
const phase36Pairing = read('src/inventory-bridge/pairing/v1/scanOpsEphemeralPairingClientV1.js');
const phase37Reliable = read('src/inventory-bridge/reliableDelivery/v1/index.js');
const phase38Count = read('src/inventory-bridge/countHandoff/v1/index.js');

check('phase_locked', evidence.phase === '39-0A', evidence.phase);
check('repository_locked', evidence.repository === 'chrykoolaid/invyra-scanops', evidence.repository);
check('scanops_baseline_locked', evidence.baseline.scanOpsMain === '31f9e6605b95f5d8e907cf8dac2f01a13685d8d0', evidence.baseline.scanOpsMain);
check('inventory_baseline_locked', evidence.baseline.inventoryMain === 'bbfd5ae270d06bcaf1a2d1d2441407c9c05adbb5', evidence.baseline.inventoryMain);
check('current_connection_readiness_fails', evidence.decisions.currentOperatorConnectionReadiness === 'FAIL');
check('next_implementation_phase_passes', evidence.decisions.phase39_0BImplementationReadiness === 'PASS');
check('receiving_remains_blocked', evidence.decisions.receivingIntegrationAuthorised === false);
check('required_next_phase_locked', evidence.decisions.requiredNextPhase === '39-0B');

check('vite_web_shell_confirmed', packageJson.scripts?.dev === 'vite', packageJson.scripts?.dev);
check('sync_handoff_profile_storage_present', syncHandoff.includes('scanops_sync_endpoint_config') && syncHandoff.includes('localStorage'));
check('sync_handoff_connection_test_is_profile_only', syncHandoff.includes('const ok = Boolean(latestConfig.ipAddress || latestConfig.desktopName);') && syncHandoff.includes('Profile ready'));
check('sync_handoff_does_not_import_phase35_client', !syncHandoff.includes('createScanOpsTestTransportClientV1'));
check('sync_handoff_does_not_import_phase36_client', !syncHandoff.includes('createScanOpsEphemeralPairingClientV1'));
check('connectivity_test_is_local_projection', connectivity.includes('export function runConnectionTest') && connectivity.includes('profile.bridge_host === "Not paired"') && connectivity.includes('writeKey(BRIDGE_HEALTH_KEY'));
check('connectivity_does_not_import_phase35_client', !connectivity.includes('createScanOpsTestTransportClientV1'));

check('phase35_real_health_client_present', phase35Transport.includes('async function sendEnvelope') && phase35Transport.includes('async function sendHealthPing') && phase35Transport.includes('fetchAdapter(endpoint'));
check('phase35_test_training_only', phase35Transport.includes("['TEST', 'TRAINING']"));
check('phase35_validates_receipt_correlation', phase35Transport.includes('validateCanonicalReceiptV1') && phase35Transport.includes('receiptValidation.correlated'));
check('phase36_pairing_client_present', phase36Pairing.includes('async function pair') && phase36Pairing.includes('parsePairingOffer'));
check('phase36_uses_node_crypto', phase36Pairing.includes("from 'node:crypto'") && phase36Pairing.includes('generateKeyPairSync'));
check('phase36_not_browser_wired', evidence.findings.browserPairingAdapterPresent === false && evidence.findings.phase36PairingClientWiredToUi === false);
check('phase37_reliable_delivery_present', phase37Reliable.includes('createScanOpsReliableDeliveryQueueV1'));
check('phase38_count_handoff_present', phase38Count.includes('createScanOpsCountSubmissionQueueV1'));

check('real_ui_health_gap_recorded', evidence.findings.syncHandoffPerformsRealHealthRequest === false && evidence.findings.scanOpsConnectivityPerformsRealHealthRequest === false);
check('browser_adapter_gap_recorded', evidence.findings.browserPairingAdapterPresent === false);
check('browser_durability_gap_recorded', evidence.findings.browserQueueUsesPhase37FilesystemDurability === false);
check('hosted_private_http_not_certified', evidence.findings.hostedHttpsToPrivateHttpCertified === false);
check('test_training_only', JSON.stringify(evidence.approvedPilot.environments) === JSON.stringify(['TEST', 'TRAINING']));
check('live_blocked', evidence.approvedPilot.liveBlocked === true);
check('production_blocked', evidence.approvedPilot.productionBlocked === true);
check('verified_health_required', evidence.approvedPilot.verifiedHealthRequiredForConnectedState === true);
check('secrets_not_persisted', evidence.secretStoragePolicy.privateKeyInLocalStorage === false
  && evidence.secretStoragePolicy.pairingTokenInLocalStorage === false
  && evidence.secretStoragePolicy.pairingChallengeInLocalStorage === false
  && evidence.secretStoragePolicy.rawPairingQrInLocalStorage === false);
check('no_mutation_authorised', Object.values(evidence.mutationGuards).every((value) => value === false));

check('report_contains_fail_decision', report.includes('real pairing or health request to Inventory? | **FAIL**'));
check('report_blocks_receiving', report.includes('Receiving integration authorised? | **BLOCKED**'));
check('report_names_runtime_adapter_gap', report.includes('missing work is the browser/runtime adapter and UI wiring'));
check('report_authorises_only_39_0b', report.includes('Phase 39-0A authorises Phase 39-0B connection setup implementation only.'));

const failed = checks.filter((entry) => !entry.passed);
const output = {
  phase: '39-0A',
  repository: 'chrykoolaid/invyra-scanops',
  passed: failed.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failed.length,
  failedChecks: failed.length,
  decisions: evidence.decisions,
  secretStoragePolicy: evidence.secretStoragePolicy,
  mutationGuards: evidence.mutationGuards,
  checks,
};

console.log(JSON.stringify(output, null, 2));
if (failed.length > 0) process.exitCode = 1;
