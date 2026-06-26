import { SCANOPS_BRIDGE_TRAINING_HANDSHAKE_FIXTURES, SCANOPS_BRIDGE_TRAINING_HANDSHAKE_PHASE } from './trainingHandshakeFixtures.js';
import { getScanOpsBridgeTrainingHandshakeReadinessResults } from './trainingHandshakeReadiness.js';

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsBridgeTrainingHandshakeStatus(fixtures = SCANOPS_BRIDGE_TRAINING_HANDSHAKE_FIXTURES) {
  const results = getScanOpsBridgeTrainingHandshakeReadinessResults(fixtures);
  const checks = Object.freeze([
    check('phase_marker', SCANOPS_BRIDGE_TRAINING_HANDSHAKE_PHASE === '7B/7D'),
    check('fixtures_present', fixtures.length > 0),
    check('all_results_passed', results.every((result) => result.passed)),
  ]);

  return Object.freeze({
    component: 'scanops_bridge_phase_7_status',
    phase: SCANOPS_BRIDGE_TRAINING_HANDSHAKE_PHASE,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
