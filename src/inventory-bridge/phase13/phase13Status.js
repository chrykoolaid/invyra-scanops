import { SCANOPS_PHASE13, SCANOPS_PHASE13_FIXTURES } from './phase13Fixtures.js';
import { getScanOpsPhase13HandshakeResults } from './phase13Handshake.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsPhase13Status(fixtures = SCANOPS_PHASE13_FIXTURES) {
  const results = getScanOpsPhase13HandshakeResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', SCANOPS_PHASE13 === '13B/13D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'scanops_phase13_status',
    phase: SCANOPS_PHASE13,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
