import {
  SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS,
  SCANOPS_BRIDGE_LOCAL_TRANSPORT_COMPONENT,
  SCANOPS_BRIDGE_LOCAL_TRANSPORT_FIXTURES,
  SCANOPS_BRIDGE_LOCAL_TRANSPORT_PHASE,
  SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES,
} from './localTransportFixtures.js';

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function freezePreflightResult(result) {
  return Object.freeze({
    ...result,
    blocked_reasons: freezeArray(result.blocked_reasons),
    endpoint_descriptor: Object.freeze({ ...(result.endpoint_descriptor || {}) }),
  });
}

function uniqueReasons(reasons) {
  return freezeArray([...new Set(reasons.filter(Boolean))]);
}

function hasEndpointDescriptor(endpointDescriptor) {
  return Boolean(endpointDescriptor && typeof endpointDescriptor.descriptor_id === 'string' && endpointDescriptor.descriptor_id.trim());
}

function requestedEnabledState(configuration, endpointDescriptor, input) {
  return configuration.bridge_enabled === true
    || configuration.activation_requested === true
    || endpointDescriptor.bridge_enabled === true
    || input.bridge_enabled === true
    || input.activation_requested === true;
}

export function buildScanOpsBridgeLocalTransportPreflight(input = {}, options = {}) {
  const configuration = Object.freeze({ ...(options.configuration || input.configuration || {}) });
  const endpointDescriptor = Object.freeze({ ...(options.endpointDescriptor || input.endpoint_descriptor || input.endpointDescriptor || {}) });
  const endpointDescriptorPresent = hasEndpointDescriptor(endpointDescriptor);
  const unsafeEnabledRequest = requestedEnabledState(configuration, endpointDescriptor, input);

  const blockedReasons = [
    SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.TRANSPORT_DISABLED,
    SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.RUNTIME_DISABLED,
    SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.SCANOPS_CAPTURE_ONLY,
    SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.INVENTORY_SYSTEM_OF_RECORD,
    SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.INVENTORY_CALLS_OUT_OF_SCOPE,
    SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.OUTBOX_PROCESSING_DISABLED,
    SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.ACTIVATION_OUT_OF_SCOPE,
  ];

  if (!endpointDescriptorPresent) {
    blockedReasons.push(SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.ENDPOINT_DESCRIPTOR_REQUIRED);
  }

  if (unsafeEnabledRequest) {
    blockedReasons.push(SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.UNSAFE_ENABLED_REQUEST);
  }

  return freezePreflightResult({
    component: SCANOPS_BRIDGE_LOCAL_TRANSPORT_COMPONENT,
    phase: SCANOPS_BRIDGE_LOCAL_TRANSPORT_PHASE,
    bridge_enabled: false,
    capture_only: true,
    activation_state: SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES.DISABLED,
    transport_status: SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES.NON_OPERATIONAL,
    preflight_status: SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES.BLOCKED,
    readiness_status: SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES.DISABLED,
    diagnostics_status: SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES.READ_ONLY,
    endpoint_descriptor_present: endpointDescriptorPresent,
    endpoint_descriptor: endpointDescriptor,
    can_activate: false,
    dispatchable: false,
    transportable: false,
    inventory_callable: false,
    outbox_processable: false,
    transport_attempted: false,
    network_check_attempted: false,
    port_bound: false,
    inbound_channel_started: false,
    outbound_channel_started: false,
    sync_attempted: false,
    inventory_call_attempted: false,
    outbox_processing_attempted: false,
    replay_attempted: false,
    receipt_emitted: false,
    acknowledgement_emitted: false,
    write_attempted: false,
    mutation_attempted: false,
    blocked_reasons: uniqueReasons(blockedReasons),
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function projectScanOpsBridgeLocalTransportPreflightResult(fixture) {
  const preflight = buildScanOpsBridgeLocalTransportPreflight({
    configuration: fixture.configuration,
    endpoint_descriptor: fixture.endpoint_descriptor,
  });

  const checks = Object.freeze([
    check('bridge_disabled', preflight.bridge_enabled === fixture.expected.bridge_enabled),
    check('capture_only', preflight.capture_only === fixture.expected.capture_only),
    check('activation_disabled', preflight.activation_state === fixture.expected.activation_state),
    check('transport_non_operational', preflight.transport_status === fixture.expected.transport_status),
    check('preflight_blocked', preflight.preflight_status === fixture.expected.preflight_status),
    check('readiness_disabled', preflight.readiness_status === fixture.expected.readiness_status),
    check('cannot_activate', preflight.can_activate === fixture.expected.can_activate),
    check('not_dispatchable', preflight.dispatchable === fixture.expected.dispatchable),
    check('not_transportable', preflight.transportable === fixture.expected.transportable),
    check('not_inventory_callable', preflight.inventory_callable === fixture.expected.inventory_callable),
    check('not_outbox_processable', preflight.outbox_processable === fixture.expected.outbox_processable),
    check('endpoint_descriptor_present', preflight.endpoint_descriptor_present === fixture.expected.endpoint_descriptor_present),
    check('blocked_reasons', fixture.expected.blocked_reasons.every((reason) => preflight.blocked_reasons.includes(reason))),
    check('no_transport_attempt', preflight.transport_attempted === false),
    check('no_network_check', preflight.network_check_attempted === false),
    check('no_port_binding', preflight.port_bound === false),
    check('no_inbound_channel', preflight.inbound_channel_started === false),
    check('no_outbound_channel', preflight.outbound_channel_started === false),
    check('no_sync', preflight.sync_attempted === false),
    check('no_inventory_call', preflight.inventory_call_attempted === false),
    check('no_outbox_processing', preflight.outbox_processing_attempted === false),
    check('no_replay', preflight.replay_attempted === false),
    check('no_receipt', preflight.receipt_emitted === false),
    check('no_acknowledgement', preflight.acknowledgement_emitted === false),
    check('no_write', preflight.write_attempted === false),
    check('no_mutation', preflight.mutation_attempted === false),
  ]);

  return Object.freeze({
    fixture_id: fixture.fixture_id,
    description: fixture.description,
    expected: fixture.expected,
    preflight,
    passed: checks.every((item) => item.passed),
    checks,
  });
}

export function getScanOpsBridgeLocalTransportPreflightResults(fixtures = SCANOPS_BRIDGE_LOCAL_TRANSPORT_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsBridgeLocalTransportPreflightResult));
}
