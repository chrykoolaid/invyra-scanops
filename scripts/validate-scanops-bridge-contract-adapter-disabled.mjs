import { SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS } from '../src/inventory-bridge/config/bridgeConfigurationDefaults.js';
import {
  SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS,
  assessScanOpsBridgeEventEnvelopeContract,
  classifyScanOpsBridgeEventEnvelopeShape,
  getScanOpsBridgeEventEnvelopeContractDiagnostics,
  normalizeScanOpsBridgeEventEnvelopeCandidate,
} from '../src/inventory-bridge/contracts/index.js';

const errors = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

const validCandidate = Object.freeze({
  schema_version: 'scanops-bridge.v1',
  event_type: 'scanops.capture.recorded',
  event_id: 'scanops_evt_phase5a_candidate_001',
  occurred_at: '2026-06-25T00:00:00.000Z',
  source: Object.freeze({
    system: 'scanops',
    device_id: 'scan-device-001',
    store_id: 'store-001',
    session_id: 'scan-session-001',
  }),
  payload: Object.freeze({
    evidence_only: true,
  }),
});

const normalized = normalizeScanOpsBridgeEventEnvelopeCandidate(validCandidate);
const shape = classifyScanOpsBridgeEventEnvelopeShape(validCandidate);

assert(normalized.schema_version === validCandidate.schema_version, 'normalized schema version must preserve candidate data');
assert(normalized.event_type === validCandidate.event_type, 'normalized event type must preserve candidate data');
assert(Object.isFrozen(normalized), 'normalized candidate must be frozen');
assert(Object.isFrozen(normalized.source), 'normalized source must be frozen');
assert(shape.classification === SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.ACCEPTABLE_SHAPE, 'valid candidate shape must be acceptable shape only');
assert(shape.acceptable_shape === true, 'valid candidate shape must set acceptable_shape=true');

const defaultAssessment = assessScanOpsBridgeEventEnvelopeContract(validCandidate);

assert(defaultAssessment.accepted === false, 'default assessment must never accept dispatch');
assert(defaultAssessment.dispatchable === false, 'default assessment must never be dispatchable');
assert(defaultAssessment.transportable === false, 'default assessment must never be transportable');
assert(defaultAssessment.outbox_processable === false, 'default assessment must never be outbox processable');
assert(defaultAssessment.writable === false, 'default assessment must never be writable');
assert(defaultAssessment.inventory_callable === false, 'default assessment must never be Inventory callable');
assert(defaultAssessment.capture_only === true, 'default assessment must preserve capture_only=true');
assert(defaultAssessment.runtime_status.enabled === false, 'runtime must remain disabled');
assert(defaultAssessment.runtime_status.ready === false, 'runtime must remain not ready');
assert(defaultAssessment.runtime_status.operational === false, 'runtime must remain non-operational');
assert(defaultAssessment.classification === SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_RUNTIME_DISABLED, 'valid candidate must still be rejected while runtime is disabled');

const configuredAssessment = assessScanOpsBridgeEventEnvelopeContract(validCandidate, {
  configuration: Object.freeze({
    ...SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS,
    bridge_enabled: true,
    transport_enabled: true,
    outbox_processing_enabled: true,
    replay_enabled: true,
    local_device_id: 'scan-device-001',
    target_inventory_instance_id: 'inventory-instance-001',
    accepted_schema_versions: Object.freeze(['scanops-bridge.v1']),
    accepted_event_types: Object.freeze(['scanops.capture.recorded']),
    allowed_store_ids: Object.freeze(['store-001']),
  }),
});

assert(configuredAssessment.accepted === false, 'configured assessment must never accept dispatch');
assert(configuredAssessment.dispatchable === false, 'configured assessment must never be dispatchable');
assert(configuredAssessment.transportable === false, 'configured assessment must never be transportable');
assert(configuredAssessment.outbox_processable === false, 'configured assessment must never be outbox processable');
assert(configuredAssessment.writable === false, 'configured assessment must never be writable');
assert(configuredAssessment.inventory_callable === false, 'configured assessment must never be Inventory callable');
assert(configuredAssessment.runtime_status.enabled === false, 'attempted enabled config must not enable runtime');
assert(configuredAssessment.classification === SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_RUNTIME_DISABLED, 'attempted enabled config must still reject runtime disabled');

const rejectedSchemaAssessment = assessScanOpsBridgeEventEnvelopeContract(validCandidate, {
  configuration: Object.freeze({
    ...SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS,
    accepted_schema_versions: Object.freeze(['other-schema']),
  }),
});

assert(rejectedSchemaAssessment.classification === SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_SCHEMA_VERSION, 'schema mismatch must reject schema version');
assert(rejectedSchemaAssessment.accepted === false, 'schema mismatch must not accept');

const rejectedEventTypeAssessment = assessScanOpsBridgeEventEnvelopeContract(validCandidate, {
  configuration: Object.freeze({
    ...SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS,
    accepted_event_types: Object.freeze(['other-event']),
  }),
});

assert(rejectedEventTypeAssessment.classification === SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_EVENT_TYPE, 'event type mismatch must reject event type');
assert(rejectedEventTypeAssessment.accepted === false, 'event type mismatch must not accept');

const rejectedStoreAssessment = assessScanOpsBridgeEventEnvelopeContract(validCandidate, {
  configuration: Object.freeze({
    ...SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS,
    allowed_store_ids: Object.freeze(['other-store']),
  }),
});

assert(rejectedStoreAssessment.classification === SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_SOURCE_CONTEXT, 'store mismatch must reject source context');
assert(rejectedStoreAssessment.accepted === false, 'store mismatch must not accept');

const rejectedDeviceAssessment = assessScanOpsBridgeEventEnvelopeContract(validCandidate, {
  configuration: Object.freeze({
    ...SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS,
    local_device_id: 'other-device',
  }),
});

assert(rejectedDeviceAssessment.classification === SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_SOURCE_CONTEXT, 'local device mismatch must reject source context');
assert(rejectedDeviceAssessment.accepted === false, 'local device mismatch must not accept');

const malformedAssessment = assessScanOpsBridgeEventEnvelopeContract({
  schema_version: '',
  event_type: '',
  payload: null,
});

assert(malformedAssessment.accepted === false, 'malformed candidate must not accept');
assert(malformedAssessment.dispatchable === false, 'malformed candidate must not be dispatchable');
assert(malformedAssessment.transportable === false, 'malformed candidate must not be transportable');
assert(malformedAssessment.outbox_processable === false, 'malformed candidate must not be outbox processable');
assert(malformedAssessment.writable === false, 'malformed candidate must not be writable');
assert(malformedAssessment.inventory_callable === false, 'malformed candidate must not be Inventory callable');
assert(malformedAssessment.classification === SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_SOURCE_CONTEXT, 'malformed candidate must reject source context/shape');

const diagnostics = getScanOpsBridgeEventEnvelopeContractDiagnostics(validCandidate, {
  configuration: Object.freeze({
    ...SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS,
    accepted_schema_versions: Object.freeze(['scanops-bridge.v1']),
    accepted_event_types: Object.freeze(['scanops.capture.recorded']),
    allowed_store_ids: Object.freeze(['store-001']),
    local_device_id: 'scan-device-001',
  }),
});

assert(diagnostics.passed === true, 'diagnostics must pass disabled contract checks');
assert(Array.isArray(diagnostics.checks), 'diagnostics must expose checks');
assert(validCandidate.payload.evidence_only === true, 'contract adapter must not mutate caller-provided payload');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 5A disabled contract adapter remains pure, capture-only, non-dispatchable, non-transportable, and non-writable.');
