import {
  SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_FIXTURES,
  SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_PHASE,
} from './handshakeCandidateFixtures.js';
import { getScanOpsBridgeHandshakeCandidateResults } from './handshakeCandidateProjection.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsBridgeHandshakeCandidateSummary(fixtures = SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_FIXTURES) {
  const results = getScanOpsBridgeHandshakeCandidateResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_PHASE === '8B/8D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'scanops_bridge_phase_8_candidate_summary',
    phase: SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_PHASE,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
