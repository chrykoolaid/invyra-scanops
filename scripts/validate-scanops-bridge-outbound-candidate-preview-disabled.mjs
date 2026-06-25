import { SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS } from '../src/inventory-bridge/config/bridgeConfigurationDefaults.js';
import {
  SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS,
  assessScanOpsBridgeEventEnvelopeContract,
} from '../src/inventory-bridge/contracts/index.js';
import {
  SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_COMPONENT,
  SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_PHASE,
  SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS,
  SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES,
  buildScanOpsBridgeOutboundCandidatePreview,
  getScanOpsBridgeOutboundCandidatePreviewDiagnostics,
} from '../src/inventory-bridge/outboundCandidate/index.js';

const errors = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

const validCandidate = Object.freeze({
  schema_version: 'scanops-bridge.v1',
  event_type: 'scanops.capture.recorded',
  event_id: 'scanops_evt_phase5b_candidate_001',
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

const defaultPreview = buildScanOpsBridgeOutboundCandidatePreview(validCandidate);
const repeatedPreview = buildScanOpsBridgeOutboundCandidatePreview(validCandidate);

assert(Object.isFrozen(defaultPreview), 'outbound candidate preview must be frozen');
assert(defaultPreview.component === SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_COMPONENT, 'preview component marker must match');
assert(defaultPreview.phase === SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_PHASE, 'preview phase marker must match');
assert(defaultPreview.candidate_status === SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.RUNTIME_DISABLED, 'valid candidate must still be runtime-disabled');
assert(defaultPreview.candidate_reason === SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS.RUNTIME_DISABLED, 'valid candidate reason must remain runtime disabled');
assert(defaultPreview.contract_classification === SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS.REJECTED_RUNTIME_DISABLED, 'contract classification must remain runtime disabled');
assert(defaultPreview.candidate_preview_id === repeatedPreview.candidate_preview_id, 'preview id must be deterministic');
assert(defaultPreview.idempotency_key === repeatedPreview.idempotency_key, 'idempotency key must be deterministic');
assert(JSON.stringify(defaultPreview) === JSON.stringify(repeatedPreview), 'preview output must be deterministic');

assert(defaultPreview.runtime_enabled === false, 'runtime_enabled must remain false');
assert(defaultPreview.runtime_ready === false, 'runtime_ready must remain false');
assert(defaultPreview.runtime_operational === false, 'runtime_operational must remain false');
assert(defaultPreview.contract_accepted === false, 'contract_accepted must remain false');
assert(defaultPreview.contract_dispatchable === false, 'contract_dispatchable must remain false');
assert(defaultPreview.contract_transportable === false, 'contract_transportable must remain false');
assert(defaultPreview.contract_outbox_processable === false, 'contract_outbox_processable must remain false');
assert(defaultPreview.contract_inventory_callable === false, 'contract_inventory_callable must remain false');
assert(defaultPreview.contract_writable === false, 'contract_writable must remain false');
assert(defaultPreview.capture_only === true, 'capture_only must remain true');
assert(defaultPreview.dispatchable === false, 'dispatchable must remain false');
assert(defaultPreview.transportable === false, 'transportable must remain false');
assert(defaultPreview.outbox_processable === false, 'outbox_processable must remain false');
assert(defaultPreview.inventory_callable === false, 'inventory_callable must remain false');
assert(defaultPreview.persistable === false, 'persistable must remain false');
assert(defaultPreview.writable === false, 'writable must remain false');
assert(defaultPreview.replayable === false, 'replayable must remain false');
assert(defaultPreview.acknowledgement_emittable === false, 'acknowledgement_emittable must remain false');
assert(defaultPreview.receipt_emittable === false, 'receipt_emittable must remain false');
assert(defaultPreview.mutating === false, 'mutating must remain false');

const unsafeConfiguration = Object.freeze({
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
});

const unsafePreview = buildScanOpsBridgeOutboundCandidatePreview(validCandidate, {
  configuration: unsafeConfiguration,
});

assert(unsafePreview.runtime_enabled === false, 'unsafe configuration must not enable runtime');
assert(unsafePreview.dispatchable === false, 'unsafe configuration must not make preview dispatchable');
assert(unsafePreview.transportable === false, 'unsafe configuration must not make preview transportable');
assert(unsafePreview.outbox_processable === false, 'unsafe configuration must not make preview outbox-processable');
assert(unsafePreview.inventory_callable === false, 'unsafe configuration must not make preview Inventory-callable');
assert(unsafePreview.persistable === false, 'unsafe configuration must not make preview persistable');
assert(unsafePreview.writable === false, 'unsafe configuration must not make preview writable');
assert(unsafePreview.acknowledgement_emittable === false, 'unsafe configuration must not emit acknowledgements');
assert(unsafePreview.receipt_emittable === false, 'unsafe configuration must not emit receipts');
assert(unsafePreview.mutating === false, 'unsafe configuration must not mutate');

const rejectedSchemaPreview = buildScanOpsBridgeOutboundCandidatePreview(validCandidate, {
  configuration: Object.freeze({
    ...SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS,
    accepted_schema_versions: Object.freeze(['other-schema']),
  }),
});

assert(rejectedSchemaPreview.candidate_status === SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.CONTRACT_REJECTED, 'schema mismatch must produce contract-rejected preview');
assert(rejectedSchemaPreview.candidate_reason === SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_REASONS.CONTRACT_REJECTED, 'schema mismatch reason must be contract rejected');
assert(rejectedSchemaPreview.dispatchable === false, 'schema mismatch preview must not be dispatchable');

const malformedPreview = buildScanOpsBridgeOutboundCandidatePreview({
  schema_version: '',
  event_type: '',
  payload: null,
});

assert(malformedPreview.candidate_status === SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_STATUSES.CONTRACT_REJECTED, 'malformed candidate must produce contract-rejected preview');
assert(malformedPreview.dispatchable === false, 'malformed preview must not be dispatchable');
assert(malformedPreview.transportable === false, 'malformed preview must not be transportable');
assert(malformedPreview.outbox_processable === false, 'malformed preview must not be outbox-processable');
assert(malformedPreview.inventory_callable === false, 'malformed preview must not be Inventory-callable');
assert(malformedPreview.persistable === false, 'malformed preview must not be persistable');
assert(malformedPreview.writable === false, 'malformed preview must not be writable');

const contractAssessment = assessScanOpsBridgeEventEnvelopeContract(validCandidate, {
  configuration: unsafeConfiguration,
});
const previewFromAssessment = buildScanOpsBridgeOutboundCandidatePreview(validCandidate, {
  contractAssessment,
});

assert(previewFromAssessment.contract_classification === contractAssessment.classification, 'preview must preserve supplied contract assessment classification');
assert(previewFromAssessment.dispatchable === false, 'preview from supplied assessment must not be dispatchable');
assert(previewFromAssessment.inventory_callable === false, 'preview from supplied assessment must not be Inventory-callable');

const diagnostics = getScanOpsBridgeOutboundCandidatePreviewDiagnostics(validCandidate, {
  configuration: unsafeConfiguration,
});

assert(diagnostics.passed === true, 'diagnostics must pass disabled preview checks');
assert(Array.isArray(diagnostics.checks), 'diagnostics must expose checks');
assert(diagnostics.preview.dispatchable === false, 'diagnostics preview must remain non-dispatchable');
assert(diagnostics.preview.inventory_callable === false, 'diagnostics preview must remain non-Inventory-callable');

assert(validCandidate.payload.evidence_only === true, 'preview must not mutate caller-provided payload');
assert(unsafeConfiguration.bridge_enabled === true, 'preview must not mutate caller-provided configuration');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 5B outbound candidate preview remains disabled, capture-only, non-dispatchable, non-transportable, non-outbox-processable, non-Inventory-callable, non-writable, and non-mutating.');
