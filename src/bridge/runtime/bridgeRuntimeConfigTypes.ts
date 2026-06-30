export type BridgeEnvironment = "TEST";

export interface BridgeRuntimeConfig {
  environment: BridgeEnvironment;

  runtimeEnabled: boolean;

  allowNetwork: false;

  allowDiscovery: false;

  allowPairing: false;

  allowTransport: false;

  allowPersistence: false;

  allowMutation: false;

  runtimeVersion: string;
}

export const DEFAULT_RUNTIME_CONFIG: BridgeRuntimeConfig = {
  environment: "TEST",

  runtimeEnabled: true,

  allowNetwork: false,

  allowDiscovery: false,

  allowPairing: false,

  allowTransport: false,

  allowPersistence: false,

  allowMutation: false,

  runtimeVersion: "32.A2",
};