import { SCANOPS_PHASE19, SCANOPS_PHASE19_FIXTURES } from './phase19Fixtures.js';
import { getScanOpsPhase19GateResults } from './phase19Gate.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsPhase19Summary(fixtures = SCANOPS_PHASE19_FIXTURES) {
  const results = getScanOpsPhase19GateResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', SCANOPS_PHASE19 === '19B/19D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'scanops_phase19_summary',
    phase: SCANOPS_PHASE19,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
