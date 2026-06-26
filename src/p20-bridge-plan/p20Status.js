import { P20_SCANOPS, P20_SCANOPS_FIXTURES } from './p20Fixtures.js';
import { getP20ScanOpsPlanResults } from './p20Plan.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getP20ScanOpsStatus(fixtures = P20_SCANOPS_FIXTURES) {
  const results = getP20ScanOpsPlanResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', P20_SCANOPS === '20B/20D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'p20_scanops_status',
    phase: P20_SCANOPS,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
