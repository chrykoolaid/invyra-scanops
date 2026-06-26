import {
  SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS,
  SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_COMPONENT,
  SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_FIXTURES,
  SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_PHASE,
  SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_REQUIRED_FIELDS,
  SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_STATUSES,
} from './handshakeEvidenceFixtures.js';

const READY_ENVIRONMENTS = Object.freeze(['TRAINING', 'TEST']);
const BLOCKED_LIVE_ENVIRONMENTS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function uniqueReasons(reasons) {
  return freezeArray([...new Set(reasons.filter(Boolean))]);
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

function requiredFieldsPresent(descriptor) {
  return SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_REQUIRED_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function environmentBlockers(environment) {
  if (environment === 'LIVE') return [SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.LIVE_BLOCKED];
  if (environment === 'PRODUCTION') return [SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.PRODUCTION_BLOCKED];
  if (!READY_ENVIRONMENTS.includes(environment)) return [SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.UNKNOWN_ENVIRONMENT];
  return [];
}

function buildEvidenceKey(descriptor, environment) {
  return [
    SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_PHASE,
    environment,
    descriptor.source_system || 'SCANOPS',
    descriptor.source_device_id || 'missing-device',
    descriptor.source_store_id || 'missing-store',
    descriptor.target_system || 'INVENTORY',
    descriptor.candidate_id || 'missing-candidate',
    descriptor.candidate_key || 'missing-key',
  ].join('::');
}

export function buildScanOpsBridgeHandshakeEvidence(input = {}) {
  const descriptor = Object.freeze({ ...(input.evidence_descriptor || input.evidenceDescriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const fieldsPresent = requiredFieldsPresent(descriptor);
  const evidenceReady = READY_ENVIRONMENTS.includes(environment) && fieldsPresent;
  const liveBlocked = BLOCKED_LIVE_ENVIRONMENTS.includes(environment);

  const blockedReasons = uniqueReasons([
    ...environmentBlockers(environment),
    ...(fieldsPresent ? [] : [SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.REQUIRED_FIELDS_MISSING]),
    SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.DISPATCH_BLOCKED,
    SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.INVENTORY_CALL_BLOCKED,
    SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.PERSIST_BLOCKED,
    SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.WRITE_BLOCKED,
    SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.MUTATION_BLOCKED,
  ]);

  return Object.freeze({
    component: SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_COMPONENT,
    phase: SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_PHASE,
    evidence_id: descriptor.evidence_id || 'scanops-handshake-evidence-unidentified',
    environment,
    source_system: descriptor.source_system || 'SCANOPS',
    target_system: descriptor.target_system || 'INVENTORY',
    evidence_status: evidenceReady
      ? SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_STATUSES.EVIDENCE_READY
      : SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_STATUSES.BLOCKED,
    status_mode: SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_STATUSES.READ_ONLY,
    evidence_key: buildEvidenceKey(descriptor, environment),
    evidence_only: true,
    capture_only: true,
    required_fields_present: fieldsPresent,
    live_blocked: liveBlocked,
    can_build_evidence: evidenceReady,
    can_dispatch: false,
    can_call_inventory: false,
    can_persist: false,
    can_write: false,
    can_mutate: false,
    dispatched: false,
    inventory_called: false,
    persisted: false,
    receipt_emitted: false,
    acknowledgement_emitted: false,
    write_attempted: false,
    mutation_attempted: false,
    blocked_reasons: blockedReasons,
    evidence_descriptor: descriptor,
  });
}

export function projectScanOpsBridgeHandshakeEvidenceResult(fixture) {
  const evidence = buildScanOpsBridgeHandshakeEvidence({
    evidence_descriptor: fixture.evidence_descriptor,
  });

  const checks = Object.freeze([
    check('environment', evidence.environment === fixture.expected.environment),
    check('status', evidence.evidence_status === fixture.expected.evidence_status),
    check('live_blocked', evidence.live_blocked === fixture.expected.live_blocked),
    check('fields_present', evidence.required_fields_present === fixture.expected.required_fields_present),
    check('can_build_evidence', evidence.can_build_evidence === fixture.expected.can_build_evidence),
    check('evidence_only', evidence.evidence_only === true),
    check('capture_only', evidence.capture_only === true),
    check('blocked_reasons', fixture.expected.blocked_reasons.every((reason) => evidence.blocked_reasons.includes(reason))),
    check('not_dispatched', evidence.can_dispatch === false && evidence.dispatched === false),
    check('no_inventory_call', evidence.can_call_inventory === false && evidence.inventory_called === false),
    check('not_persisted', evidence.can_persist === false && evidence.persisted === false),
    check('no_receipt', evidence.receipt_emitted === false),
    check('no_acknowledgement', evidence.acknowledgement_emitted === false),
    check('no_write', evidence.can_write === false && evidence.write_attempted === false),
    check('no_mutation', evidence.can_mutate === false && evidence.mutation_attempted === false),
  ]);

  return Object.freeze({
    fixture_id: fixture.fixture_id,
    description: fixture.description,
    expected: fixture.expected,
    evidence,
    passed: checks.every((item) => item.passed),
    checks,
  });
}

export function getScanOpsBridgeHandshakeEvidenceResults(fixtures = SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsBridgeHandshakeEvidenceResult));
}
