import { P21_SCAN, P21_SCAN_FIXTURES } from './p21Fixtures.js';
import { getP21ScanGateResults } from './p21Gate.js';

function ok(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getP21ScanCheck(fixtures = P21_SCAN_FIXTURES) {
  const results = getP21ScanGateResults(fixtures);
  const checks = Object.freeze([
    ok('phase_marker', P21_SCAN === '21B/21D'),
    ok('fixtures_present', fixtures.length > 0),
    ok('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'p21_scan_check',
    phase: P21_SCAN,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
