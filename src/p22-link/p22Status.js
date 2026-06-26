import { P22_SCAN, P22_SCAN_FIXTURES } from './p22Fixtures.js';
import { getP22ScanLinkResults } from './p22Link.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getP22ScanStatus(fixtures = P22_SCAN_FIXTURES) {
  const results = getP22ScanLinkResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', P22_SCAN === '22B/22D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'p22_scan_status',
    phase: P22_SCAN,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
