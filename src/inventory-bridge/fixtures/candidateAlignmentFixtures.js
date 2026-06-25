import { SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS } from '../config/bridgeConfigurationDefaults.js';
import { SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS } from '../contracts/index.js';
import {
  SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS,
  SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES,
} from '../outboundCandidate/index.js';

export const SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_PHASE = '5C';
export const SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_COMPONENT = 'scanops_bridge_cross_repo_candidate_fixture_alignment';

const BASE_SOURCE = Object.freeze({
  system: 'scanops',
  device_id: 'scan-device-001',
  store_id: 'store-001',
  session_id: 'scan-session-001',
});

const BASE_PAYLOAD = Object.freeze({
  evidence_only: true,
  scan_reference: 'scanops-fixture-phase5c-001',
});

export const SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_BASE_EVENT = Object.freeze({
  schema_version: 'scanops-bridge.v1',
  event_type: 'scanops.capture.recorded',
  event_id: 'scanops_evt_phase5c_alignment_001',
  occurred_at: '2026-06-25T00:00:00.000Z',
  source: BASE_SOURCE,
  payload: BASE_PAYLOAD,
});

const ACCEPTING_DISABLED_CONFIGURATION = Object.freeze({
  ...SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS,
  local_device_id: 'scan-device-001',
  target_inventory_instance_id: 'inventory-instance-001',
  accepted_schema_versions: Object.freeze(['scanops-bridge.v1']),
  accepted_event_types: Object.freeze(['scanops.capture.recorded']),
  allowed_store_ids: Object.freeze(['store-001']),
});

const UNSAFE_ENABLED_CONFIGURATION_ATTEMPT = Object.freeze({
  ...ACCEPTING_DISABLED_CONFIGURATION,
  bridge_enabled: true,
  transport_enabled: true,
  outbox_processing_enabled: true,
  replay_enabled: true,
});

function cloneBaseEvent(overrides = {}) {
  return Object.freeze({
    ...SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_BASE_EVENT,
    ...overrides,
    source: Object.freeze({
      ...BASE_SOURCE,
      ...(overrides.source || {}),
    }),
    payload: overrides.payload === undefined
      ? BASE_PAYLOAD
      : overrides.payload,
  });
}

function freezeFixture(fixture) {
  return Object.freeze({
    ...fixture,
    candidate: Object.freeze({ ...fixture.candidate }),
    configuration: Object.freeze({ ...fixture.configuration }),
    expected: Object.freeze({ ...fixture.expected }),
  });
}

function expectedIdentityKey(candidate = SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_BASE_EVENT) {
  const source = candidate.source || {};

  return [
    candidate.schema_version || 'none',
    candidate.event_type || 'none',
    candidate.event_id || 'none',
    source.system || 'none',
    source.device_id || 'none',
    source.store_id || 'none',
  ].join(':').toLowerCase();
}

export const SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_FIXTURES = Object.freeze([
  freezeFixture({
    fixture_id: 'valid_evidence_runtime_disabled',
    description: 'Valid shared evidence shape remains runtime-disabled before any dispatch pathway exists.',
    candidate: cloneBaseEvent(),
    configuration: ACCEPTING_DISABLED_CONFIGURATION,
    expected: {
      evidence_identity_key: expectedIdentityKey(),
      contract_classification: SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_RUNTIME_DISABLED,
      candidate_status: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.RUNTIME_DISABLED,
      candidate_reason: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS.RUNTIME_DISABLED,
    },
  }),
  freezeFixture({
    fixture_id: 'schema_mismatch',
    description: 'Schema mismatch is rejected before any outbound candidate can be dispatched.',
    candidate: cloneBaseEvent(),
    configuration: Object.freeze({
      ...ACCEPTING_DISABLED_CONFIGURATION,
      accepted_schema_versions: Object.freeze(['scanops-bridge.v2']),
    }),
    expected: {
      evidence_identity_key: expectedIdentityKey(),
      contract_classification: SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_SCHEMA_VERSION,
      candidate_status: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.CONTRACT_REJECTED,
      candidate_reason: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS.CONTRACT_REJECTED,
    },
  }),
  freezeFixture({
    fixture_id: 'event_type_mismatch',
    description: 'Event type mismatch is rejected before transport, outbox processing, or Inventory calls.',
    candidate: cloneBaseEvent(),
    configuration: Object.freeze({
      ...ACCEPTING_DISABLED_CONFIGURATION,
      accepted_event_types: Object.freeze(['scanops.other.recorded']),
    }),
    expected: {
      evidence_identity_key: expectedIdentityKey(),
      contract_classification: SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_EVENT_TYPE,
      candidate_status: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.CONTRACT_REJECTED,
      candidate_reason: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS.CONTRACT_REJECTED,
    },
  }),
  freezeFixture({
    fixture_id: 'store_mismatch',
    description: 'Store mismatch is rejected as source-context drift.',
    candidate: cloneBaseEvent(),
    configuration: Object.freeze({
      ...ACCEPTING_DISABLED_CONFIGURATION,
      allowed_store_ids: Object.freeze(['store-999']),
    }),
    expected: {
      evidence_identity_key: expectedIdentityKey(),
      contract_classification: SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_SOURCE_CONTEXT,
      candidate_status: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.CONTRACT_REJECTED,
      candidate_reason: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS.CONTRACT_REJECTED,
    },
  }),
  freezeFixture({
    fixture_id: 'device_mismatch',
    description: 'Device mismatch is rejected as local-device drift.',
    candidate: cloneBaseEvent(),
    configuration: Object.freeze({
      ...ACCEPTING_DISABLED_CONFIGURATION,
      local_device_id: 'scan-device-999',
    }),
    expected: {
      evidence_identity_key: expectedIdentityKey(),
      contract_classification: SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_SOURCE_CONTEXT,
      candidate_status: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.CONTRACT_REJECTED,
      candidate_reason: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS.CONTRACT_REJECTED,
    },
  }),
  freezeFixture({
    fixture_id: 'malformed_payload',
    description: 'Malformed payload is rejected and never becomes dispatchable, transportable, or writable.',
    candidate: cloneBaseEvent({ payload: null }),
    configuration: ACCEPTING_DISABLED_CONFIGURATION,
    expected: {
      evidence_identity_key: expectedIdentityKey(),
      contract_classification: SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_SOURCE_CONTEXT,
      candidate_status: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.CONTRACT_REJECTED,
      candidate_reason: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS.CONTRACT_REJECTED,
    },
  }),
  freezeFixture({
    fixture_id: 'unsafe_enabled_configuration_attempt',
    description: 'Unsafe enabled configuration attempt still produces a disabled, capture-only, non-dispatchable preview.',
    candidate: cloneBaseEvent(),
    configuration: UNSAFE_ENABLED_CONFIGURATION_ATTEMPT,
    expected: {
      evidence_identity_key: expectedIdentityKey(),
      contract_classification: SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_RUNTIME_DISABLED,
      candidate_status: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.RUNTIME_DISABLED,
      candidate_reason: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS.RUNTIME_DISABLED,
    },
  }),
]);
