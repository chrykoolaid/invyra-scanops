import {
  SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_FIXTURES,
  SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_PHASE,
} from './handshakeEvidenceFixtures.js';
import { getScanOpsBridgeHandshakeEvidenceResults } from './handshakeEvidenceProjection.js';

function statusCheck(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function getScanOpsBridgeHandshakeEvidenceStatus(fixtures = SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_FIXTURES) {
  const results = getScanOpsBridgeHandshakeEvidenceResults(fixtures);
  const readyResults = results.filter((result) => ['TRAINING', 'TEST'].includes(result.evidence.environment) && result.evidence.required_fields_present);
  const blockedResults = results.filter((result) => result.evidence.evidence_status === 'BLOCKED');
  const checks = Object.freeze([
    statusCheck('phase_marker', SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_PHASE === '9B/9D'),
    statusCheck('fixtures_present', fixtures.length > 0),
    statusCheck('all_results_passed', results.every((result) => result.passed)),
    statusCheck('ready_results_are_evidence_only', readyResults.every((result) => result.evidence.can_build_evidence === true && result.evidence.evidence_only === true)),
    statusCheck('blocked_results_are_blocked', blockedResults.every((result) => result.evidence.can_build_evidence === false)),
    statusCheck('capture_only', results.every((result) => result.evidence.capture_only === true)),
    statusCheck('no_effects', results.every((result) => result.evidence.can_write === false && result.evidence.can_mutate === false)),
  ]);

  return Object.freeze({
    component: 'scanops_bridge_phase_9_evidence_status',
    phase: SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_PHASE,
    passed: checks.every((item) => item.passed),
    fixture_count: fixtures.length,
    ready_count: readyResults.length,
    blocked_count: blockedResults.length,
    results,
    checks,
  });
}
