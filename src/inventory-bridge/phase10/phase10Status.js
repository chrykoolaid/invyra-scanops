import { SCANOPS_PHASE10, SCANOPS_PHASE10_FIXTURES } from './phase10Fixtures.js';
import { getScanOpsPhase10ReviewResults } from './phase10Review.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsPhase10Status(fixtures = SCANOPS_PHASE10_FIXTURES) {
  const results = getScanOpsPhase10ReviewResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', SCANOPS_PHASE10 === '10B/10D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'scanops_phase10_status',
    phase: SCANOPS_PHASE10,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
