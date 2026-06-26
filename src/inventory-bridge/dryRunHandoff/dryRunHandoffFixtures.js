import { SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_FIXTURES } from '../fixtures/index.js';

export const SCANOPS_BRIDGE_DRY_RUN_HANDOFF_PHASE = '5D';
export const SCANOPS_BRIDGE_DRY_RUN_HANDOFF_COMPONENT = 'scanops_bridge_disabled_dry_run_handoff';

export const SCANOPS_BRIDGE_DRY_RUN_HANDOFF_STATUSES = Object.freeze({
  DRY_RUN_DISABLED: 'DRY_RUN_DISABLED',
  CONTRACT_REJECTED: 'CONTRACT_REJECTED',
  RUNTIME_DISABLED: 'RUNTIME_DISABLED',
});

export const SCANOPS_BRIDGE_DRY_RUN_HANDOFF_REASONS = Object.freeze({
  CONTRACT_REJECTED: 'contract_rejected_before_dry_run_handoff',
  RUNTIME_DISABLED: 'runtime_disabled_before_dry_run_handoff',
  HANDOFF_DISABLED: 'dry_run_handoff_disabled_non_operational',
});

function freezeFixture(fixture) {
  return Object.freeze({
    ...fixture,
    candidate: Object.freeze({ ...fixture.candidate }),
    configuration: Object.freeze({ ...fixture.configuration }),
    expected: Object.freeze({ ...fixture.expected }),
  });
}

function mapExpectedDryRunStatus(candidateStatus) {
  if (candidateStatus === 'RUNTIME_DISABLED') return SCANOPS_BRIDGE_DRY_RUN_HANDOFF_STATUSES.RUNTIME_DISABLED;
  if (candidateStatus === 'CONTRACT_REJECTED') return SCANOPS_BRIDGE_DRY_RUN_HANDOFF_STATUSES.CONTRACT_REJECTED;
  return SCANOPS_BRIDGE_DRY_RUN_HANDOFF_STATUSES.DRY_RUN_DISABLED;
}

function mapExpectedDryRunReason(candidateReason) {
  if (candidateReason === 'runtime_disabled_before_outbound_candidate') return SCANOPS_BRIDGE_DRY_RUN_HANDOFF_REASONS.RUNTIME_DISABLED;
  if (candidateReason === 'contract_rejected_before_outbound_candidate') return SCANOPS_BRIDGE_DRY_RUN_HANDOFF_REASONS.CONTRACT_REJECTED;
  return SCANOPS_BRIDGE_DRY_RUN_HANDOFF_REASONS.HANDOFF_DISABLED;
}

export const SCANOPS_BRIDGE_DRY_RUN_HANDOFF_FIXTURES = Object.freeze(
  SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_FIXTURES.map((fixture) => freezeFixture({
    fixture_id: fixture.fixture_id,
    description: `Dry-run handoff for ${fixture.fixture_id}.`,
    candidate: fixture.candidate,
    configuration: fixture.configuration,
    expected: {
      ...fixture.expected,
      dry_run_status: mapExpectedDryRunStatus(fixture.expected.candidate_status),
      dry_run_reason: mapExpectedDryRunReason(fixture.expected.candidate_reason),
      capture_only: true,
      transport_attempted: false,
      ingestion_attempted: false,
      outbox_processing_attempted: false,
      replay_attempted: false,
      inventory_call_attempted: false,
      ledger_write_attempted: false,
      receipt_emitted: false,
      acknowledgement_emitted: false,
      mutation_attempted: false,
    },
  })),
);
