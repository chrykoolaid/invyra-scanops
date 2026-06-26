import { SCANOPS_PHASE16, SCANOPS_PHASE16_FIXTURES } from './phase16Fixtures.js';
import { getScanOpsPhase16ResponseResults } from './phase16Response.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsPhase16Summary(fixtures = SCANOPS_PHASE16_FIXTURES) {
  const results = getScanOpsPhase16ResponseResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', SCANOPS_PHASE16 === '16B/16D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'scanops_phase16_summary',
    phase: SCANOPS_PHASE16,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
