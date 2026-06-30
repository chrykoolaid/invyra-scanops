import {
  BRIDGE_ALLOWED_ENVIRONMENTS,
  BRIDGE_RUNTIME_VERSION,
  type BridgeRuntimeEnvironment,
  type BridgeRuntimeIdentity,
  type BridgeRuntimeLifecycleState,
  type BridgeRuntimeOptions,
  type BridgeRuntimeReadiness,
  type BridgeRuntimeSnapshot,
} from "./bridgeRuntimeTypes";
import {
  buildBridgeRuntimeReadiness,
  buildFaultedBridgeRuntimeReadiness,
  createBridgeRuntimeGuardrailStatus,
} from "./bridgeRuntimeReadiness";
import {
  createBridgeRuntimeConfig,
} from "./bridgeRuntimeConfig";
import {
  createBridgeFeatureGateRegistry,
} from "./bridgeFeatureGates";

const TEST_ENVIRONMENT: BridgeRuntimeEnvironment = "TEST";

export class BridgeRuntime {
  private lifecycleState: BridgeRuntimeLifecycleState = "UNINITIALIZED";
  private readonly environment: BridgeRuntimeEnvironment;
  private readinessReason = "Runtime constructed. Bridge is inactive.";

  constructor(options: BridgeRuntimeOptions) {
    this.environment = options.environment;
  }

  getIdentity(): BridgeRuntimeIdentity {
    return {
      runtimeName: "scanops-inventory-bridge",
      runtimeVersion: BRIDGE_RUNTIME_VERSION,
      systemOfRecord: "Inventory Desktop",
      operationalLayer: "ScanOps",
      phase: "32-A4",
    };
  }

  getLifecycleState(): BridgeRuntimeLifecycleState {
    return this.lifecycleState;
  }

  getGuardrails() {
    return createBridgeRuntimeGuardrailStatus();
  }

  initialize(): BridgeRuntimeReadiness {
    if (!this.isTestOnlyEnvironment()) {
      this.lifecycleState = "FAULTED";
      this.readinessReason =
        "Bridge runtime refused startup because only TEST mode is allowed in Phase 32-A4.";
      return this.getReadiness();
    }

    this.lifecycleState = "INITIALIZING";
    this.readinessReason = "Bridge runtime is initializing in TEST mode only.";

    this.lifecycleState = "READY_TEST_IDLE";
    this.readinessReason =
      "Bridge runtime is ready in TEST idle mode. Communication, persistence, mutation, and operational feature gates remain disabled.";

    return this.getReadiness();
  }

  stop(): BridgeRuntimeReadiness {
    if (this.lifecycleState === "STOPPED") {
      return this.getReadiness();
    }

    if (this.lifecycleState === "FAULTED") {
      this.lifecycleState = "STOPPED";
      this.readinessReason = "Faulted TEST runtime stopped safely.";
      return this.getReadiness();
    }

    this.lifecycleState = "STOPPING";
    this.readinessReason = "Bridge runtime is stopping without communication or mutation.";

    this.lifecycleState = "STOPPED";
    this.readinessReason = "Bridge runtime stopped safely.";

    return this.getReadiness();
  }

  getReadiness(): BridgeRuntimeReadiness {
    const runtimeConfig = createBridgeRuntimeConfig();
    const featureGates = createBridgeFeatureGateRegistry();

    if (this.lifecycleState === "FAULTED") {
      return buildFaultedBridgeRuntimeReadiness({
        environment: this.environment,
        reason: this.readinessReason,
        runtimeConfig,
        featureGates,
      });
    }

    return buildBridgeRuntimeReadiness({
      environment: this.environment,
      lifecycleState: this.lifecycleState,
      reason: this.readinessReason,
      runtimeConfig,
      featureGates,
    });
  }

  getSnapshot(): BridgeRuntimeSnapshot {
    const runtimeConfig = createBridgeRuntimeConfig();
    const featureGates = createBridgeFeatureGateRegistry();

    return {
      identity: this.getIdentity(),
      environment: this.environment,
      lifecycleState: this.lifecycleState,
      readiness: this.getReadiness(),
      runtimeConfig,
      featureGates,
    };
  }

  private isTestOnlyEnvironment(): boolean {
    return (
      this.environment === TEST_ENVIRONMENT &&
      BRIDGE_ALLOWED_ENVIRONMENTS.includes(this.environment as "TEST")
    );
  }
}

export const createBridgeRuntime = (options: BridgeRuntimeOptions): BridgeRuntime =>
  new BridgeRuntime(options);
