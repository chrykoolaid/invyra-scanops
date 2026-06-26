import { SCANOPS_PHASE11, SCANOPS_PHASE11_FIXTURES } from './phase11Fixtures.js';
import { getScanOpsPhase11HandoffResults } from './phase11Handoff.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsPhase11Status(fixtures = SCANOPS_PHASE11_FIXTURES) {
  const results = getScanOpsPhase11HandoffResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', SCANOPS_PHASE11 === '11B/11D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'scanops_phase11_status',
    phase: SCANOPS_PHASE11,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
