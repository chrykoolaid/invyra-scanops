export type BridgeFeatureGateName =
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

export interface BridgeFeatureGateDefinition {
  name: BridgeFeatureGateName;

  label: string;

  enabled: false;

  phaseIntroduced: "32.A3";

  operationalCapability: false;
}

export type BridgeFeatureGateRegistry = Record<
  BridgeFeatureGateName,
  BridgeFeatureGateDefinition
>;

export const BRIDGE_FEATURE_GATE_NAMES: readonly BridgeFeatureGateName[] = [
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
