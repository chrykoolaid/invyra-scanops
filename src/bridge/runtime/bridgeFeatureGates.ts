import {
  BridgeFeatureGateRegistry,
} from "./bridgeFeatureGateTypes";

import {
  validateBridgeFeatureGateRegistry,
} from "./bridgeFeatureGateValidation";

export const DEFAULT_BRIDGE_FEATURE_GATES: BridgeFeatureGateRegistry = {
  discovery: {
    name: "discovery",
    label: "Discovery",
    enabled: false,
    phaseIntroduced: "32.A3",
    operationalCapability: false,
  },

  qrPairing: {
    name: "qrPairing",
    label: "QR pairing",
    enabled: false,
    phaseIntroduced: "32.A3",
    operationalCapability: false,
  },

  trustedDeviceRegistry: {
    name: "trustedDeviceRegistry",
    label: "Trusted device registry",
    enabled: false,
    phaseIntroduced: "32.A3",
    operationalCapability: false,
  },

  transport: {
    name: "transport",
    label: "Transport",
    enabled: false,
    phaseIntroduced: "32.A3",
    operationalCapability: false,
  },

  outboundQueue: {
    name: "outboundQueue",
    label: "Outbound queue",
    enabled: false,
    phaseIntroduced: "32.A3",
    operationalCapability: false,
  },

  inboundInbox: {
    name: "inboundInbox",
    label: "Inbound inbox",
    enabled: false,
    phaseIntroduced: "32.A3",
    operationalCapability: false,
  },

  receipts: {
    name: "receipts",
    label: "Receipts",
    enabled: false,
    phaseIntroduced: "32.A3",
    operationalCapability: false,
  },

  acknowledgements: {
    name: "acknowledgements",
    label: "Acknowledgements",
    enabled: false,
    phaseIntroduced: "32.A3",
    operationalCapability: false,
  },

  diagnostics: {
    name: "diagnostics",
    label: "Diagnostics",
    enabled: false,
    phaseIntroduced: "32.A3",
    operationalCapability: false,
  },

  recovery: {
    name: "recovery",
    label: "Recovery",
    enabled: false,
    phaseIntroduced: "32.A3",
    operationalCapability: false,
  },
};

export function createBridgeFeatureGateRegistry(): BridgeFeatureGateRegistry {

  const registry: BridgeFeatureGateRegistry = {
    discovery: {
      ...DEFAULT_BRIDGE_FEATURE_GATES.discovery,
    },

    qrPairing: {
      ...DEFAULT_BRIDGE_FEATURE_GATES.qrPairing,
    },

    trustedDeviceRegistry: {
      ...DEFAULT_BRIDGE_FEATURE_GATES.trustedDeviceRegistry,
    },

    transport: {
      ...DEFAULT_BRIDGE_FEATURE_GATES.transport,
    },

    outboundQueue: {
      ...DEFAULT_BRIDGE_FEATURE_GATES.outboundQueue,
    },

    inboundInbox: {
      ...DEFAULT_BRIDGE_FEATURE_GATES.inboundInbox,
    },

    receipts: {
      ...DEFAULT_BRIDGE_FEATURE_GATES.receipts,
    },

    acknowledgements: {
      ...DEFAULT_BRIDGE_FEATURE_GATES.acknowledgements,
    },

    diagnostics: {
      ...DEFAULT_BRIDGE_FEATURE_GATES.diagnostics,
    },

    recovery: {
      ...DEFAULT_BRIDGE_FEATURE_GATES.recovery,
    },
  };

  validateBridgeFeatureGateRegistry(registry);

  return registry;
}
