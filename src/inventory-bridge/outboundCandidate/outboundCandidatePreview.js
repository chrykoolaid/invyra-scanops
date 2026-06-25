import {
  SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS,
  assessScanOpsBridgeEventEnvelopeContract,
} from '../contracts/index.js';

export const SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_PHASE = '5B';
export const SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_COMPONENT = 'scanops_bridge_disabled_outbound_candidate_preview';

export const SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES = Object.freeze({
  PREVIEW_DISABLED: 'PREVIEW_DISABLED',
  CONTRACT_REJECTED: 'CONTRACT_REJECTED',
  RUNTIME_DISABLED: 'RUNTIME_DISABLED',
});

export const SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS = Object.freeze({
  CONTRACT_REJECTED: 'contract_rejected_before_outbound_candidate',
  RUNTIME_DISABLED: 'runtime_disabled_before_outbound_candidate',
  OUTBOUND_PREVIEW_DISABLED: 'outbound_candidate_preview_disabled_non_dispatchable',
});

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeSegment(value, fallback = 'none') {
  const normalized = asTrimmedString(value)
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

function freezeIssues(issues = []) {
  return Object.freeze(issues.map((issue) => Object.freeze({ ...issue })));
}

export function getScanOpsBridgeOutboundCandidateReason(contractAssessment) {
  if (contractAssessment.classification === SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_RUNTIME_DISABLED) {
    return SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS.RUNTIME_DISABLED;
  }

  if (contractAssessment.classification !== SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.ACCEPTABLE_SHAPE) {
    return SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS.CONTRACT_REJECTED;
  }

  return SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS.OUTBOUND_PREVIEW_DISABLED;
}

export function getScanOpsBridgeOutboundCandidateStatus(contractAssessment) {
  if (contractAssessment.classification === SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_RUNTIME_DISABLED) {
    return SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.RUNTIME_DISABLED;
  }

  if (contractAssessment.classification !== SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.ACCEPTABLE_SHAPE) {
    return SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.CONTRACT_REJECTED;
  }

  return SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.PREVIEW_DISABLED;
}

export function getScanOpsBridgeOutboundCandidateIdempotencyKey(contractAssessment) {
  const normalized = contractAssessment.normalized || {};
  const source = normalized.source || {};

  return [
    'scanops-bridge-outbound-candidate',
    safeSegment(normalized.schema_version),
    safeSegment(normalized.event_type),
    safeSegment(normalized.event_id),
    safeSegment(source.system),
    safeSegment(source.device_id),
    safeSegment(source.store_id),
  ].join(':');
}

export function buildScanOpsBridgeOutboundCandidatePreview(candidate = {}, options = {}) {
  const contractAssessment = options.contractAssessment || assessScanOpsBridgeEventEnvelopeContract(candidate, options);
  const normalized = contractAssessment.normalized || {};
  const source = normalized.source || {};
  const runtimeStatus = contractAssessment.runtime_status || {};
  const idempotencyKey = getScanOpsBridgeOutboundCandidateIdempotencyKey(contractAssessment);
  const candidateReason = getScanOpsBridgeOutboundCandidateReason(contractAssessment);
  const candidateStatus = getScanOpsBridgeOutboundCandidateStatus(contractAssessment);

  return Object.freeze({
    component: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_COMPONENT,
    phase: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_PHASE,
    candidate_preview_id: `preview:${idempotencyKey}`,
    candidate_status: candidateStatus,
    candidate_reason: candidateReason,
    schema_version: normalized.schema_version || null,
    event_type: normalized.event_type || null,
    event_id: normalized.event_id || null,
    occurred_at: normalized.occurred_at || null,
    source_system: source.system || null,
    source_device_id: source.device_id || null,
    source_store_id: source.store_id || null,
    source_session_id: source.session_id || null,
    idempotency_key: idempotencyKey,
    runtime_state: runtimeStatus.state || 'DISABLED',
    runtime_enabled: false,
    runtime_ready: false,
    runtime_operational: false,
    contract_classification: contractAssessment.classification,
    contract_accepted: false,
    contract_dispatchable: false,
    contract_transportable: false,
    contract_outbox_processable: false,
    contract_inventory_callable: false,
    contract_writable: false,
    capture_only: true,
    contract_issues: freezeIssues(contractAssessment.issues),
    dispatchable: false,
    transportable: false,
    outbox_processable: false,
    inventory_callable: false,
    persistable: false,
    writable: false,
    replayable: false,
    acknowledgement_emittable: false,
    receipt_emittable: false,
    mutating: false,
  });
}
