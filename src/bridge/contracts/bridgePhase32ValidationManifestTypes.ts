import type {
  BridgeManualSyncBoundaryReport,
} from "./bridgeManualSyncBoundaryReportTypes";

export type BridgePhase32ValidationManifestPhase = "32.C8";

export type BridgePhase32ValidationEntryStatus = "required";

export interface BridgePhase32ValidationEntry {
  readonly scriptPath: string;

  readonly scope: "runtime" | "contract" | "registry" | "boundary";

  readonly status: BridgePhase32ValidationEntryStatus;

  readonly packageRegistrationReviewed: false;
}

export interface BridgeExternalBridgeSurfaceEntry {
  readonly phase: "8" | "9" | "10";

  readonly label: string;

  readonly phase32Owned: false;

  readonly requiresSeparateGovernanceReview: true;
}

export interface BridgePhase32ValidationManifestTotals {
  readonly validationCount: number;

  readonly externalSurfaceCount: 3;

  readonly packageRegistrationChangesApplied: false;
}

export interface BridgePhase32ValidationManifest {
  readonly phase: BridgePhase32ValidationManifestPhase;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly boundaryReport: BridgeManualSyncBoundaryReport;

  readonly validations: readonly BridgePhase32ValidationEntry[];

  readonly externalBridgeSurfaces: readonly BridgeExternalBridgeSurfaceEntry[];

  readonly totals: BridgePhase32ValidationManifestTotals;

  readonly phase32RuntimeStillInactive: true;

  readonly phase32ReadyForActivation: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly cleanupPassDeferred: true;

  readonly reason: string;
}
