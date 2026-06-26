import { SCANOPS_PHASE18, SCANOPS_PHASE18_FIXTURES } from './phase18Fixtures.js';
import { getScanOpsPhase18AcceptanceResults } from './phase18Acceptance.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsPhase18Summary(fixtures = SCANOPS_PHASE18_FIXTURES) {
  const results = getScanOpsPhase18AcceptanceResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', SCANOPS_PHASE18 === '18B/18D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'scanops_phase18_summary',
    phase: SCANOPS_PHASE18,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
