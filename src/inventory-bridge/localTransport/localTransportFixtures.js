export const SCANOPS_BRIDGE_LOCAL_TRANSPORT_PHASE = '6B/6D';
export const SCANOPS_BRIDGE_LOCAL_TRANSPORT_COMPONENT = 'scanops_bridge_disabled_local_transport_scaffold';

export const SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES = Object.freeze({
  DISABLED: 'DISABLED',
  NON_OPERATIONAL: 'NON_OPERATIONAL',
  BLOCKED: 'BLOCKED',
  READ_ONLY: 'READ_ONLY',
});

export const SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS = Object.freeze({
  TRANSPORT_DISABLED: 'local_transport_disabled_by_phase_6_guardrail',
  RUNTIME_DISABLED: 'runtime_bridge_disabled',
  SCANOPS_CAPTURE_ONLY: 'scanops_remains_capture_only',
  INVENTORY_SYSTEM_OF_RECORD: 'inventory_remains_system_of_record',
  INVENTORY_CALLS_OUT_OF_SCOPE: 'inventory_calls_out_of_scope_in_phase_6',
  OUTBOX_PROCESSING_DISABLED: 'outbox_processing_disabled',
  ACTIVATION_OUT_OF_SCOPE: 'activation_not_allowed_in_phase_6',
  ENDPOINT_DESCRIPTOR_REQUIRED: 'endpoint_descriptor_required_before_future_activation',
  UNSAFE_ENABLED_REQUEST: 'unsafe_enabled_request_blocked',
});

const BASE_DISABLED_ENDPOINT_DESCRIPTOR = Object.freeze({
  descriptor_id: 'scanops-local-transport-disabled-endpoint-v1',
  descriptor_kind: 'LOCAL_TRANSPORT_ENDPOINT_DESCRIPTOR',
  transport_mode: 'LOCAL_IP_WIFI_DESCRIPTOR',
  bridge_enabled: false,
  activation_state: SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES.DISABLED,
  transport_status: SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES.NON_OPERATIONAL,
  environment: 'LOCAL_DESCRIPTOR_ONLY',
  address_family: 'PRIVATE_LAN_DESCRIPTOR',
  host: '0.0.0.0',
  port: 0,
  protocol: 'DISABLED_LOCAL_DESCRIPTOR',
  device_id: 'scanops-device-placeholder',
  store_id: 'store-placeholder',
});

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function freezeObject(value) {
  return Object.freeze({ ...(value || {}) });
}

function freezeFixture(fixture) {
  return Object.freeze({
    ...fixture,
    configuration: freezeObject(fixture.configuration),
    endpoint_descriptor: freezeObject(fixture.endpoint_descriptor),
    expected: Object.freeze({
      ...fixture.expected,
      blocked_reasons: freezeArray(fixture.expected.blocked_reasons),
    }),
  });
}

const REQUIRED_DISABLED_EXPECTATION = Object.freeze({
  bridge_enabled: false,
  capture_only: true,
  activation_state: SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES.DISABLED,
  transport_status: SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES.NON_OPERATIONAL,
  preflight_status: SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES.BLOCKED,
  readiness_status: SCANOPS_BRIDGE_LOCAL_TRANSPORT_STATUSES.DISABLED,
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
});

export const SCANOPS_BRIDGE_LOCAL_TRANSPORT_FIXTURES = Object.freeze([
  freezeFixture({
    fixture_id: 'disabled_default_local_transport',
    description: 'Default ScanOps local transport scaffold remains disabled, capture-only, and non-operational.',
    configuration: {
      bridge_enabled: false,
      activation_requested: false,
      local_transport_scaffold_enabled: false,
      environment: 'DEVELOPMENT',
    },
    endpoint_descriptor: BASE_DISABLED_ENDPOINT_DESCRIPTOR,
    expected: {
      ...REQUIRED_DISABLED_EXPECTATION,
      endpoint_descriptor_present: true,
      blocked_reasons: [
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.TRANSPORT_DISABLED,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.RUNTIME_DISABLED,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.SCANOPS_CAPTURE_ONLY,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.INVENTORY_SYSTEM_OF_RECORD,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.INVENTORY_CALLS_OUT_OF_SCOPE,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.OUTBOX_PROCESSING_DISABLED,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.ACTIVATION_OUT_OF_SCOPE,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'endpoint_descriptor_static_only',
    description: 'Endpoint descriptor shape is present but remains static, disabled, capture-only, and read-only.',
    configuration: {
      bridge_enabled: false,
      activation_requested: false,
      local_transport_scaffold_enabled: true,
      environment: 'TRAINING_DESCRIPTOR_ONLY',
    },
    endpoint_descriptor: {
      ...BASE_DISABLED_ENDPOINT_DESCRIPTOR,
      descriptor_id: 'scanops-local-training-descriptor-disabled-v1',
      environment: 'TRAINING_DESCRIPTOR_ONLY',
      host: '192.168.0.0',
      port: 0,
    },
    expected: {
      ...REQUIRED_DISABLED_EXPECTATION,
      endpoint_descriptor_present: true,
      blocked_reasons: [
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.TRANSPORT_DISABLED,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.RUNTIME_DISABLED,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.SCANOPS_CAPTURE_ONLY,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.INVENTORY_SYSTEM_OF_RECORD,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.INVENTORY_CALLS_OUT_OF_SCOPE,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.OUTBOX_PROCESSING_DISABLED,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.ACTIVATION_OUT_OF_SCOPE,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'unsafe_enabled_request_blocked',
    description: 'Any enabled or activation request is downgraded to disabled capture-only readiness.',
    configuration: {
      bridge_enabled: true,
      activation_requested: true,
      local_transport_scaffold_enabled: true,
      environment: 'DEVELOPMENT',
    },
    endpoint_descriptor: {
      ...BASE_DISABLED_ENDPOINT_DESCRIPTOR,
      descriptor_id: 'scanops-local-unsafe-enabled-request-v1',
      bridge_enabled: true,
      activation_state: 'REQUESTED',
    },
    expected: {
      ...REQUIRED_DISABLED_EXPECTATION,
      endpoint_descriptor_present: true,
      blocked_reasons: [
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.TRANSPORT_DISABLED,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.RUNTIME_DISABLED,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.SCANOPS_CAPTURE_ONLY,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.INVENTORY_SYSTEM_OF_RECORD,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.INVENTORY_CALLS_OUT_OF_SCOPE,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.OUTBOX_PROCESSING_DISABLED,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.ACTIVATION_OUT_OF_SCOPE,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.UNSAFE_ENABLED_REQUEST,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'missing_endpoint_descriptor_blocked',
    description: 'Missing endpoint descriptor still returns a disabled blocked readiness result.',
    configuration: {
      bridge_enabled: false,
      activation_requested: false,
      local_transport_scaffold_enabled: false,
      environment: 'DEVELOPMENT',
    },
    endpoint_descriptor: {},
    expected: {
      ...REQUIRED_DISABLED_EXPECTATION,
      endpoint_descriptor_present: false,
      blocked_reasons: [
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.TRANSPORT_DISABLED,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.RUNTIME_DISABLED,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.SCANOPS_CAPTURE_ONLY,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.INVENTORY_SYSTEM_OF_RECORD,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.INVENTORY_CALLS_OUT_OF_SCOPE,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.OUTBOX_PROCESSING_DISABLED,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.ACTIVATION_OUT_OF_SCOPE,
        SCANOPS_BRIDGE_LOCAL_TRANSPORT_BLOCKERS.ENDPOINT_DESCRIPTOR_REQUIRED,
      ],
    },
  }),
]);
