import { buildScanOpsBridgeOutboundCandidatePreview } from '../outboundCandidate/index.js';
import { SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_FIXTURES } from './candidateAlignmentFixtures.js';

function check(name, passed, detail) {
  return Object.freeze({ name, passed: passed === true, detail });
}

function getPreviewEvidenceIdentityKey(preview) {
  return [
    preview.schema_version || 'none',
    preview.event_type || 'none',
    preview.event_id || 'none',
    preview.source_system || 'none',
    preview.source_device_id || 'none',
    preview.source_store_id || 'none',
  ].join(':').toLowerCase();
}

export function projectScanOpsBridgeCandidateAlignmentResult(fixture) {
  const preview = buildScanOpsBridgeOutboundCandidatePreview(fixture.candidate, {
    configuration: fixture.configuration,
  });

  const checks = Object.freeze([
    check('contract_classification', preview.contract_classification === fixture.expected.contract_classification, `Expected contract classification ${fixture.expected.contract_classification}.`),
    check('candidate_status', preview.candidate_status === fixture.expected.candidate_status, `Expected candidate status ${fixture.expected.candidate_status}.`),
    check('candidate_reason', preview.candidate_reason === fixture.expected.candidate_reason, `Expected candidate reason ${fixture.expected.candidate_reason}.`),
    check('evidence_identity_key', getPreviewEvidenceIdentityKey(preview) === fixture.expected.evidence_identity_key, 'Expected shared evidence identity key to remain stable.'),
    check('idempotency_key_shape', preview.idempotency_key.endsWith(fixture.expected.evidence_identity_key), 'Expected ScanOps idempotency key to end with shared evidence identity key.'),
    check('runtime_disabled', preview.runtime_enabled === false, 'Runtime must remain disabled.'),
    check('runtime_not_ready', preview.runtime_ready === false, 'Runtime must remain not ready.'),
    check('runtime_non_operational', preview.runtime_operational === false, 'Runtime must remain non-operational.'),
    check('contract_not_accepted', preview.contract_accepted === false, 'Contract must remain non-accepted for runtime use.'),
    check('contract_non_dispatchable', preview.contract_dispatchable === false, 'Contract must remain non-dispatchable.'),
    check('contract_non_transportable', preview.contract_transportable === false, 'Contract must remain non-transportable.'),
    check('contract_non_outbox_processable', preview.contract_outbox_processable === false, 'Contract must remain non-outbox-processable.'),
    check('contract_non_inventory_callable', preview.contract_inventory_callable === false, 'Contract must remain non-Inventory-callable.'),
    check('contract_non_writable', preview.contract_writable === false, 'Contract must remain non-writable.'),
    check('capture_only_preserved', preview.capture_only === true, 'Capture-only posture must remain true.'),
    check('preview_non_dispatchable', preview.dispatchable === false, 'Preview must remain non-dispatchable.'),
    check('preview_non_transportable', preview.transportable === false, 'Preview must remain non-transportable.'),
    check('preview_non_outbox_processable', preview.outbox_processable === false, 'Preview must remain non-outbox-processable.'),
    check('preview_non_inventory_callable', preview.inventory_callable === false, 'Preview must remain non-Inventory-callable.'),
    check('preview_non_persistable', preview.persistable === false, 'Preview must remain non-persistable.'),
    check('preview_non_writable', preview.writable === false, 'Preview must remain non-writable.'),
    check('preview_non_replayable', preview.replayable === false, 'Preview must remain non-replayable.'),
    check('no_acknowledgement', preview.acknowledgement_emittable === false, 'Preview must not emit acknowledgement.'),
    check('no_receipt', preview.receipt_emittable === false, 'Preview must not emit receipt.'),
    check('no_mutation', preview.mutating === false, 'Preview must not mutate.'),
  ]);

  return Object.freeze({
    fixture_id: fixture.fixture_id,
    description: fixture.description,
    expected: fixture.expected,
    preview,
    passed: checks.every((item) => item.passed),
    checks,
  });
}

export function getScanOpsBridgeCandidateAlignmentResults(fixtures = SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsBridgeCandidateAlignmentResult));
}
