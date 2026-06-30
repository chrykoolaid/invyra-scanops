export type BridgeTrustedDeviceRegistryContractPhase = "32.B3";

export type BridgeTrustedDeviceRecordSource = "disabledPlaceholder";

export interface BridgeTrustedDeviceRecordContract {
  deviceId: string;

  source: BridgeTrustedDeviceRecordSource;

  displayName: string;

  registered: false;

  trusted: false;

  verified: false;

  reconnectAllowed: false;

  endpointResolved: false;

  transportReady: false;

  persistenceReady: false;

  mutationReady: false;

  operationalCapability: false;

  reason: string;
}

export interface BridgeTrustedDeviceRegistryContractSnapshot {
  phase: BridgeTrustedDeviceRegistryContractPhase;

  enabled: false;

  executionAllowed: false;

  registryActive: false;

  deviceRegistrationAllowed: false;

  trustEvaluationAllowed: false;

  deviceVerificationAllowed: false;

  reconnectAllowed: false;

  endpointResolutionAllowed: false;

  trustedDevicePersistenceAllowed: false;

  transportAllowed: false;

  queueProcessingAllowed: false;

  inboxProcessingAllowed: false;

  persistenceAllowed: false;

  mutationAllowed: false;

  inventoryMutationAllowed: false;

  scanOpsMutationAllowed: false;

  records: readonly BridgeTrustedDeviceRecordContract[];

  reason: string;
}
