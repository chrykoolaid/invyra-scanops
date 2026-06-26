import { SCANOPS_PHASE14, SCANOPS_PHASE14_FIXTURES } from './phase14Fixtures.js';
import { getScanOpsPhase14EventResults } from './phase14Event.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsPhase14Summary(fixtures = SCANOPS_PHASE14_FIXTURES) {
  const results = getScanOpsPhase14EventResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', SCANOPS_PHASE14 === '14B/14D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'scanops_phase14_summary',
    phase: SCANOPS_PHASE14,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
