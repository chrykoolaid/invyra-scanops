import { BRIDGE_CONTRACT_V1 } from '../../canonicalContract/v1/bridgeContractV1.js';

export function createCanonicalTransportAdapterDiagnosticsV1() {
  return Object.freeze({
    phase: '34-E-S',
    role: 'canonical-envelope-builder-and-receipt-validator',
    contractId: BRIDGE_CONTRACT_V1.contractId,
    schemaVersion: BRIDGE_CONTRACT_V1.schemaVersion,
    operationsSupported: BRIDGE_CONTRACT_V1.operationTypes,
    environmentsAllowedAtRuntime: BRIDGE_CONTRACT_V1.environments.allowedRuntime,
    environmentsBlockedAtRuntime: BRIDGE_CONTRACT_V1.environments.blockedRuntime,
    transportActivated: false,
    dispatchActivated: false,
    queueActivated: false,
    persistenceActivated: false,
    discoveryActivated: false,
    pairingActivated: false,
    authenticationActivated: false,
    retryActivated: false,
    replayActivated: false,
    fixtureExecutionActivated: false,
    mutationActivated: false,
    networkCallAllowed: false,
    fetchAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    envelopeSendAllowed: false,
    receiptApplyAllowed: false,
    reason: 'Phase 34-E-S remains a pure canonical envelope builder and receipt validator.',
  });
}
