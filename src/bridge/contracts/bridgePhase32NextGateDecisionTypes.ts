import type {
  BridgePhase32ClosureSnapshot,
} from "./bridgePhase32ClosureSnapshotTypes";

export type BridgePhase32NextGateDecisionPhase = "32.C10";

export type BridgePhase32NextAllowedStep = "phase-32-cleanup-pass";

export type BridgePhase32GateOutcome = "closed-cleanup-required-no-activation";

export interface BridgePhase32MergedExternalSurface {
  readonly phase: "8" | "9" | "10" | "11" | "12";

  readonly label: string;

  readonly phase32Owned: false;

  readonly requiresSeparateGovernanceReview: true;
}

export type BridgePhase32PendingExternalDraftSurface = never;

export interface BridgePhase32NextGateDecisionTotals {
  readonly mergedExternalSurfaceCount: 5;

  readonly pendingExternalDraftSurfaceCount: 0;

  readonly packageRegistrationChangesApplied: false;
}

export interface BridgePhase32NextGateDecision {
  readonly phase: BridgePhase32NextGateDecisionPhase;

  readonly outcome: BridgePhase32GateOutcome;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly closureSnapshot: BridgePhase32ClosureSnapshot;

  readonly nextAllowedStep: BridgePhase32NextAllowedStep;

  readonly mergedExternalSurfaces: readonly BridgePhase32MergedExternalSurface[];

  readonly pendingExternalDraftSurfaces: readonly BridgePhase32PendingExternalDraftSurface[];

  readonly totals: BridgePhase32NextGateDecisionTotals;

  readonly phase32Closed: true;

  readonly phase32RuntimeStillInactive: true;

  readonly phase32ReadyForActivation: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly cleanupPassRequired: true;

  readonly phase33GateBlockedUntilCleanup: true;

  readonly reason: string;
}
