import { buildScanOpsBridgeOutboundCandidatePreview } from '../outboundCandidate/index.js';
import {
  SCANOPS_BRIDGE_DRY_RUN_HANDOFF_COMPONENT,
  SCANOPS_BRIDGE_DRY_RUN_HANDOFF_FIXTURES,
  SCANOPS_BRIDGE_DRY_RUN_HANDOFF_PHASE,
  SCANOPS_BRIDGE_DRY_RUN_HANDOFF_REASONS,
  SCANOPS_BRIDGE_DRY_RUN_HANDOFF_STATUSES,
} from './dryRunHandoffFixtures.js';

function safeSegment(value, fallback = 'none') {
  const normalized = typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '')
    : '';
  return normalized || fallback;
}

function evidenceKey(preview) {
  return [
    preview.schema_version || 'none',
    preview.event_type || 'none',
    preview.event_id || 'none',
    preview.source_system || 'none',
    preview.source_device_id || 'none',
    preview.source_store_id || 'none',
  ].join(':').toLowerCase();
}

function dryRunStatus(outboundPreview) {
  if (outboundPreview.candidate_status === 'RUNTIME_DISABLED') return SCANOPS_BRIDGE_DRY_RUN_HANDOFF_STATUSES.RUNTIME_DISABLED;
  if (outboundPreview.candidate_status === 'CONTRACT_REJECTED') return SCANOPS_BRIDGE_DRY_RUN_HANDOFF_STATUSES.CONTRACT_REJECTED;
  return SCANOPS_BRIDGE_DRY_RUN_HANDOFF_STATUSES.DRY_RUN_DISABLED;
}

function dryRunReason(outboundPreview) {
  if (outboundPreview.candidate_reason === 'runtime_disabled_before_outbound_candidate') return SCANOPS_BRIDGE_DRY_RUN_HANDOFF_REASONS.RUNTIME_DISABLED;
  if (outboundPreview.candidate_reason === 'contract_rejected_before_outbound_candidate') return SCANOPS_BRIDGE_DRY_RUN_HANDOFF_REASONS.CONTRACT_REJECTED;
  return SCANOPS_BRIDGE_DRY_RUN_HANDOFF_REASONS.HANDOFF_DISABLED;
}

export function buildScanOpsBridgeDryRunHandoffProjection(candidate = {}, options = {}) {
  const outboundPreview = options.outboundPreview || buildScanOpsBridgeOutboundCandidatePreview(candidate, options);
  const sharedEvidenceIdentityKey = evidenceKey(outboundPreview);
  const dryRunId = [
    'scanops-bridge-dry-run-handoff',
    safeSegment(outboundPreview.schema_version),
    safeSegment(outboundPreview.event_type),
    safeSegment(outboundPreview.event_id),
    safeSegment(outboundPreview.source_system),
    safeSegment(outboundPreview.source_device_id),
    safeSegment(outboundPreview.source_store_id),
  ].join(':');

  return Object.freeze({
    component: SCANOPS_BRIDGE_DRY_RUN_HANDOFF_COMPONENT,
    phase: SCANOPS_BRIDGE_DRY_RUN_HANDOFF_PHASE,
    dry_run_id: dryRunId,
    dry_run_status: dryRunStatus(outboundPreview),
    dry_run_reason: dryRunReason(outboundPreview),
    schema_version: outboundPreview.schema_version,
    event_type: outboundPreview.event_type,
    event_id: outboundPreview.event_id,
    source_system: outboundPreview.source_system,
    source_device_id: outboundPreview.source_device_id,
    source_store_id: outboundPreview.source_store_id,
    source_session_id: outboundPreview.source_session_id,
    shared_evidence_identity_key: sharedEvidenceIdentityKey,
    scanops_idempotency_key: outboundPreview.idempotency_key,
    outbound_candidate_status: outboundPreview.candidate_status,
    ledger_candidate_status: null,
    contract_classification: outboundPreview.contract_classification,
    runtime_state: outboundPreview.runtime_state,
    runtime_enabled: false,
    runtime_ready: false,
    runtime_operational: false,
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
    dispatchable: false,
    transportable: false,
    outbox_processable: false,
    inventory_callable: false,
    persistable: false,
    writable: false,
    replayable: false,
    mutating: false,
    outbound_preview: outboundPreview,
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function projectScanOpsBridgeDryRunHandoffResult(fixture) {
  const dryRun = buildScanOpsBridgeDryRunHandoffProjection(fixture.candidate, { configuration: fixture.configuration });
  const checks = Object.freeze([
    check('dry_run_status', dryRun.dry_run_status === fixture.expected.dry_run_status),
    check('dry_run_reason', dryRun.dry_run_reason === fixture.expected.dry_run_reason),
    check('outbound_candidate_status', dryRun.outbound_candidate_status === fixture.expected.candidate_status),
    check('contract_classification', dryRun.contract_classification === fixture.expected.contract_classification),
    check('shared_evidence_identity_key', dryRun.shared_evidence_identity_key === fixture.expected.evidence_identity_key),
    check('scanops_idempotency_key_shape', dryRun.scanops_idempotency_key.endsWith(fixture.expected.evidence_identity_key)),
    check('runtime_disabled', dryRun.runtime_enabled === false && dryRun.runtime_ready === false && dryRun.runtime_operational === false),
    check('capture_only', dryRun.capture_only === true),
    check('no_transport', dryRun.transport_attempted === false && dryRun.transportable === false),
    check('no_ingestion', dryRun.ingestion_attempted === false),
    check('no_outbox_processing', dryRun.outbox_processing_attempted === false && dryRun.outbox_processable === false),
    check('no_replay', dryRun.replay_attempted === false && dryRun.replayable === false),
    check('no_inventory_call', dryRun.inventory_call_attempted === false && dryRun.inventory_callable === false),
    check('no_ledger_write', dryRun.ledger_write_attempted === false),
    check('no_receipt', dryRun.receipt_emitted === false),
    check('no_acknowledgement', dryRun.acknowledgement_emitted === false),
    check('no_mutation', dryRun.mutation_attempted === false && dryRun.mutating === false),
    check('not_dispatchable', dryRun.dispatchable === false),
    check('not_persistable', dryRun.persistable === false),
    check('not_writable', dryRun.writable === false),
  ]);

  return Object.freeze({
    fixture_id: fixture.fixture_id,
    description: fixture.description,
    expected: fixture.expected,
    dry_run: dryRun,
    passed: checks.every((item) => item.passed),
    checks,
  });
}

export function getScanOpsBridgeDryRunHandoffResults(fixtures = SCANOPS_BRIDGE_DRY_RUN_HANDOFF_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsBridgeDryRunHandoffResult));
}
