import fs from 'node:fs';
import process from 'node:process';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const synchronizer = fs.readFileSync('src/components/scanner/PairingScopeSynchronizer.jsx', 'utf8');
const connectivity = fs.readFileSync('src/lib/scanOpsLiveConnectivity.js', 'utf8');
const scan = fs.readFileSync('src/pages/Scan.jsx', 'utf8');

const failures = [];
function check(name, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`);
  if (!condition) failures.push(name);
}

check('app_imports_scope_synchronizer', app.includes("import PairingScopeSynchronizer from './components/scanner/PairingScopeSynchronizer';"));
check('app_mounts_scope_synchronizer', app.includes('<PairingScopeSynchronizer />'));
check('reads_trusted_pairing_profile', synchronizer.includes('getLiveConnectionProfile'));
check('reads_current_scanops_session', synchronizer.includes('getScanOpsSession'));
check('updates_only_session_scope_patch', synchronizer.includes('updateScanOpsSession(patch)'));
check('device_identity_guard_present', synchronizer.includes("reason: 'DEVICE_ID_CHANGED'"));
check('session_identity_guard_present', synchronizer.includes("reason: 'SESSION_SCOPE_MISMATCH'"));
check('test_training_only', synchronizer.includes("['TEST', 'TRAINING']"));
check('store_scope_alignment_present', synchronizer.includes('patch.storeId = profileStoreId'));
check('environment_scope_alignment_present', synchronizer.includes('patch.environment = profileEnvironment'));
check('device_identity_not_rewritten', !synchronizer.includes('patch.deviceId'));
check('session_identity_not_rewritten', !synchronizer.includes('patch.sessionId'));
check('operator_identity_not_rewritten', !synchronizer.includes('patch.operatorId') && !synchronizer.includes('patch.actorUserId'));
check('scan_keeps_authoritative_gate', scan.includes('getLiveItemLookupAvailability(session)'));
check('store_mismatch_gate_retained', connectivity.includes("'STORE_SCOPE_MISMATCH'"));
check('environment_mismatch_gate_retained', connectivity.includes("'ENVIRONMENT_SCOPE_MISMATCH'"));
check('session_mismatch_gate_retained', connectivity.includes("'SESSION_SCOPE_MISMATCH'"));

if (failures.length > 0) {
  console.error(`\nPHASE39_0E1_CONNECTION_SCOPE_CONSISTENCY_FAILED: ${failures.join(', ')}`);
  process.exit(1);
}

console.log('\nSCANOPS_CONNECTION_SCOPE_CONSISTENCY_READY');
