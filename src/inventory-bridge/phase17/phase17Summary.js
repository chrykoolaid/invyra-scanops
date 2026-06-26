import { SCANOPS_PHASE17, SCANOPS_PHASE17_FIXTURES } from './phase17Fixtures.js';
import { getScanOpsPhase17RecoveryResults } from './phase17Recovery.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsPhase17Summary(fixtures = SCANOPS_PHASE17_FIXTURES) {
  const results = getScanOpsPhase17RecoveryResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', SCANOPS_PHASE17 === '17B/17D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'scanops_phase17_summary',
    phase: SCANOPS_PHASE17,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
