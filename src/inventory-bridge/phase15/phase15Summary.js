import { SCANOPS_PHASE15, SCANOPS_PHASE15_FIXTURES } from './phase15Fixtures.js';
import { getScanOpsPhase15ReviewResults } from './phase15Review.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsPhase15Summary(fixtures = SCANOPS_PHASE15_FIXTURES) {
  const results = getScanOpsPhase15ReviewResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', SCANOPS_PHASE15 === '15B/15D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'scanops_phase15_summary',
    phase: SCANOPS_PHASE15,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
