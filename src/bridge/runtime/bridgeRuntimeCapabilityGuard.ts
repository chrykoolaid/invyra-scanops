import {
  BridgeFeatureGateName,
  BridgeFeatureGateRegistry,
} from "./bridgeFeatureGateTypes";

import {
  createBridgeFeatureGateRegistry,
} from "./bridgeFeatureGates";

import {
  getBridgeFeatureGateAccessResult,
} from "./bridgeFeatureGateAccessors";

export type BridgeRuntimeCapabilityName =
  | "discovery"
  | "qrPairing"
  | "trustedDeviceRegistry"
  | "transport"
  | "outboundQueue"
  | "inboundInbox"
  | "receipts"
  | "acknowledgements"
  | "diagnostics"
  | "recovery";

export interface BridgeRuntimeCapabilityDecision {
  capability: BridgeRuntimeCapabilityName;

  requiredGate: BridgeFeatureGateName;

  allowed: false;

  blocked: true;

  communicationActive: false;

  persistenceActive: false;

  mutationActive: false;

  operationalCapabilityActive: false;

  reason: string;
}

export const BRIDGE_RUNTIME_CAPABILITY_GATE_MAP: Record<
  BridgeRuntimeCapabilityName,
  BridgeFeatureGateName
> = {
  discovery: "discovery",
  qrPairing: "qrPairing",
  trustedDeviceRegistry: "trustedDeviceRegistry",
  transport: "transport",
  outboundQueue: "outboundQueue",
  inboundInbox: "inboundInbox",
  receipts: "receipts",
  acknowledgements: "acknowledgements",
  diagnostics: "diagnostics",
  recovery: "recovery",
};

export const BRIDGE_RUNTIME_CAPABILITY_NAMES: readonly BridgeRuntimeCapabilityName[] = [
  "discovery",
  "qrPairing",
  "trustedDeviceRegistry",
  "transport",
  "outboundQueue",
  "inboundInbox",
  "receipts",
  "acknowledgements",
  "diagnostics",
  "recovery",
];

export function evaluateBridgeRuntimeCapability(
  capability: BridgeRuntimeCapabilityName,
  registry: BridgeFeatureGateRegistry = createBridgeFeatureGateRegistry()
): BridgeRuntimeCapabilityDecision {

  const requiredGate = BRIDGE_RUNTIME_CAPABILITY_GATE_MAP[capability];
  const gateAccess = getBridgeFeatureGateAccessResult(requiredGate, registry);

  if (gateAccess.enabled !== false || gateAccess.blocked !== true) {
    throw new Error(
      `Bridge runtime capability "${capability}" must remain blocked.`
    );
  }

  return {
    capability,
    requiredGate,
    allowed: false,
    blocked: true,
    communicationActive: false,
    persistenceActive: false,
    mutationActive: false,
    operationalCapabilityActive: false,
    reason: `Bridge runtime capability "${capability}" is blocked by disabled gate "${requiredGate}" in Phase 32 A7.`,
  };
}

export function evaluateAllBridgeRuntimeCapabilities(
  registry: BridgeFeatureGateRegistry = createBridgeFeatureGateRegistry()
): readonly BridgeRuntimeCapabilityDecision[] {

  return BRIDGE_RUNTIME_CAPABILITY_NAMES.map((capability) =>
    evaluateBridgeRuntimeCapability(capability, registry)
  );
}

export function assertBridgeRuntimeCapabilityBlocked(
  capability: BridgeRuntimeCapabilityName,
  registry: BridgeFeatureGateRegistry = createBridgeFeatureGateRegistry()
): BridgeRuntimeCapabilityDecision {

  const decision = evaluateBridgeRuntimeCapability(capability, registry);

  if (
    decision.allowed !== false ||
    decision.blocked !== true ||
    decision.communicationActive !== false ||
    decision.persistenceActive !== false ||
    decision.mutationActive !== false ||
    decision.operationalCapabilityActive !== false
  ) {
    throw new Error(
      `Bridge runtime capability "${capability}" attempted to become operational.`
    );
  }

  return decision;
}
