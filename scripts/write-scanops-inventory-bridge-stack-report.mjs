import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const outputDir = join(process.cwd(), 'bridge-validation-reports');
const outputFile = join(outputDir, 'scanops-bridge-stack-report.json');
const startedAt = new Date().toISOString();

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

function runValidator(command) {
  console.log(`\n▶ ${command}`);
  const result = spawnSync('npm', ['run', command], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return {
    command,
    status: result.status === 0 ? 'PASS' : 'FAIL',
    exit_code: result.status ?? null,
  };
}

function writeReport(status, results, errorMessage = null) {
  mkdirSync(outputDir, { recursive: true });
  const report = {
    component: 'ScanOps',
    repo: 'invyra-scanops',
    phase: '1D-D-AM',
    status,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    command: 'node scripts/write-scanops-inventory-bridge-stack-report.mjs',
    validators,
    validator_results: results,
    failed_validators: results.filter((result) => result.status !== 'PASS').map((result) => result.command),
    error_message: errorMessage,
    guardrails: {
      projection_only: true,
      local_validator_only: true,
      readiness_review_acceptance_only: true,
      non_operational: true,
      no_operational_activation: true,
      merge_allowed: false,
      release_allowed: false,
      runtime_activation_allowed: false,
      no_relay_enforcement: true,
      no_relay_transport: true,
      no_event_transport: true,
      no_event_sync: true,
      no_event_ingestion: true,
      no_persistence_write: true,
      no_inventory_write: true,
      no_stock_price_pos_order_forecast_mutation: true,
    },
  };
  writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`ScanOps bridge stack report written to ${outputFile}`);
}

const results = validators.map(runValidator);
const failed = results.filter((result) => result.status !== 'PASS');

if (failed.length === 0) {
  writeReport('PASS', results);
} else {
  writeReport('FAIL', results, `${failed.length} ScanOps bridge validator(s) failed.`);
  process.exitCode = 1;
}
