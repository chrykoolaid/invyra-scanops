import { SCANOPS_PHASE12, SCANOPS_PHASE12_FIXTURES } from './phase12Fixtures.js';
import { getScanOpsPhase12RunnerResults } from './phase12Runner.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsPhase12Status(fixtures = SCANOPS_PHASE12_FIXTURES) {
  const results = getScanOpsPhase12RunnerResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', SCANOPS_PHASE12 === '12B/12D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'scanops_phase12_status',
    phase: SCANOPS_PHASE12,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
