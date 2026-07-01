import type {
  BridgePhase32ValidationManifest,
} from "./bridgePhase32ValidationManifestTypes";

export type BridgePhase32ClosureSnapshotPhase = "32.C9";

export type BridgePhase32ClosureStatus = "accepted-for-c10-gate-review";

export interface BridgePhase32CurrentExternalBridgeSurface {
  readonly phase: "8" | "9" | "10" | "11";

  readonly label: string;

  readonly phase32Owned: false;

  readonly requiresSeparateGovernanceReview: true;
}

export interface BridgePhase32ClosureSnapshotTotals {
  readonly manifestValidationCount: number;

  readonly manifestExternalSurfaceCount: 3;

  readonly currentExternalSurfaceCount: 4;

  readonly packageRegistrationChangesApplied: false;
}

export interface BridgePhase32ClosureSnapshot {
  readonly phase: BridgePhase32ClosureSnapshotPhase;

  readonly status: BridgePhase32ClosureStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly validationManifest: BridgePhase32ValidationManifest;

  readonly currentExternalBridgeSurfaces: readonly BridgePhase32CurrentExternalBridgeSurface[];

  readonly totals: BridgePhase32ClosureSnapshotTotals;

  readonly phase32RuntimeStillInactive: true;

  readonly phase32ReadyForActivation: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly c10GateReviewRequired: true;

  readonly cleanupPassDeferred: true;

  readonly closureAccepted: true;

  readonly reason: string;
}
