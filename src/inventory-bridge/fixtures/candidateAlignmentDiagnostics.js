import {
  SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_COMPONENT,
  SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_FIXTURES,
  SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_PHASE,
} from './candidateAlignmentFixtures.js';
import { getScanOpsBridgeCandidateAlignmentResults } from './candidateAlignmentExpectations.js';

function diagnosticCheck(name, passed, detail) {
  return Object.freeze({ name, passed: passed === true, detail });
}

export function getScanOpsBridgeCandidateAlignmentDiagnostics(fixtures = SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_FIXTURES) {
  const results = getScanOpsBridgeCandidateAlignmentResults(fixtures);
  const allResultsPassed = results.every((result) => result.passed);
  const allPreviewsDisabled = results.every((result) => result.preview.runtime_enabled === false && result.preview.runtime_ready === false && result.preview.runtime_operational === false);
  const allPreviewsNonDispatchable = results.every((result) => result.preview.dispatchable === false && result.preview.contract_dispatchable === false);
  const allPreviewsNonTransportable = results.every((result) => result.preview.transportable === false && result.preview.contract_transportable === false);
  const allPreviewsNonOutboxProcessable = results.every((result) => result.preview.outbox_processable === false && result.preview.contract_outbox_processable === false);
  const allPreviewsNonInventoryCallable = results.every((result) => result.preview.inventory_callable === false && result.preview.contract_inventory_callable === false);
  const allPreviewsNonWritable = results.every((result) => result.preview.writable === false && result.preview.contract_writable === false);
  const allPreviewsCaptureOnly = results.every((result) => result.preview.capture_only === true);
  const noReceiptsOrAcknowledgements = results.every((result) => result.preview.receipt_emittable === false && result.preview.acknowledgement_emittable === false);
  const noReplayOrMutation = results.every((result) => result.preview.replayable === false && result.preview.mutating === false);

  const checks = Object.freeze([
    diagnosticCheck('component_marker', SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_COMPONENT === 'scanops_bridge_cross_repo_candidate_fixture_alignment', 'ScanOps candidate alignment component marker is stable.'),
    diagnosticCheck('phase_marker', SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_PHASE === '5C', 'ScanOps candidate alignment phase marker is 5C.'),
    diagnosticCheck('fixtures_present', fixtures.length > 0, 'ScanOps candidate alignment fixtures are present.'),
    diagnosticCheck('all_results_passed', allResultsPassed, 'All fixture alignment results pass expected disabled outcomes.'),
    diagnosticCheck('all_previews_disabled', allPreviewsDisabled, 'All previews remain runtime-disabled, not ready, and non-operational.'),
    diagnosticCheck('all_previews_non_dispatchable', allPreviewsNonDispatchable, 'All previews remain non-dispatchable.'),
    diagnosticCheck('all_previews_non_transportable', allPreviewsNonTransportable, 'All previews remain non-transportable.'),
    diagnosticCheck('all_previews_non_outbox_processable', allPreviewsNonOutboxProcessable, 'All previews remain non-outbox-processable.'),
    diagnosticCheck('all_previews_non_inventory_callable', allPreviewsNonInventoryCallable, 'All previews remain non-Inventory-callable.'),
    diagnosticCheck('all_previews_non_writable', allPreviewsNonWritable, 'All previews remain non-writable.'),
    diagnosticCheck('all_previews_capture_only', allPreviewsCaptureOnly, 'All previews remain capture-only.'),
    diagnosticCheck('no_receipts_or_acknowledgements', noReceiptsOrAcknowledgements, 'No fixture emits receipts or acknowledgements.'),
    diagnosticCheck('no_replay_or_mutation', noReplayOrMutation, 'No fixture becomes replayable or mutating.'),
  ]);

  return Object.freeze({
    component: 'scanops_bridge_candidate_alignment_diagnostics',
    phase: SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_PHASE,
    passed: checks.every((check) => check.passed),
    fixture_count: fixtures.length,
    results,
    checks,
  });
}
