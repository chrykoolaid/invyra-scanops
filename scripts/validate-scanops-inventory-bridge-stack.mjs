import { spawnSync } from 'node:child_process';

const validators = [
  'validate:scanops-inventory-bridge-relay-admission-evidence-acceptance',
  'validate:scanops-inventory-bridge-relay-readiness-preflight-projection',
  'validate:scanops-inventory-bridge-relay-enforcement-candidate-acceptance',
  'validate:scanops-inventory-bridge-handshake-evidence-acceptance',
  'validate:scanops-inventory-bridge-gate-acceptance',
  'validate:scanops-inventory-bridge-gate-requirements-ack',
  'validate:scanops-inventory-bridge-release-blocker-acceptance',
  'validate:scanops-inventory-bridge-release-plan-draft-acceptance',
  'validate:scanops-inventory-bridge-stack-evidence-acceptance',
  'validate:scanops-inventory-bridge-stack-readiness-review-acceptance',
];

function run(command) {
  console.log(`\n▶ ${command}`);
  const result = spawnSync('npm', ['run', command], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

try {
  console.log('ScanOps bridge stack validation started');
  validators.forEach(run);
  console.log('\nScanOps bridge stack validation PASS');
} catch (error) {
  console.error('\nScanOps bridge stack validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
