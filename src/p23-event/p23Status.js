import { P23_SCAN, P23_SCAN_FIXTURES } from './p23Fixtures.js';
import { getP23ScanResults } from './p23Core.js';

function ok(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getP23ScanStatus(fixtures = P23_SCAN_FIXTURES) {
  const results = getP23ScanResults(fixtures);
  const checks = Object.freeze([
    ok('phase_marker', P23_SCAN === '23B/23D'),
    ok('fixtures_present', fixtures.length > 0),
    ok('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'p23_scan_status',
    phase: P23_SCAN,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
