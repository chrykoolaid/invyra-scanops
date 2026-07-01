import type {
  BridgePhase32ClosureSnapshot,
} from "./bridgePhase32ClosureSnapshotTypes";

export type BridgePhase32NextGateDecisionPhase = "32.C10";

export type BridgePhase32NextAllowedStep = "phase-32-cleanup-pass";

export type BridgePhase32GateOutcome = "closed-cleanup-required-no-activation";

export interface BridgePhase32PendingExternalDraftSurface {
  readonly phase: "12";

  readonly label: "Receipt decision intent surface";

  readonly pullRequest: 199;

  readonly draft: true;

  readonly merged: false;

  readonly phase32Owned: false;

  readonly requiresSeparateGovernanceReview: true;
}

export interface BridgePhase32NextGateDecisionTotals {
  readonly mergedExternalSurfaceCount: 4;

  readonly pendingExternalDraftSurfaceCount: 1;

  readonly packageRegistrationChangesApplied: false;
}

export interface BridgePhase32NextGateDecision {
  readonly phase: BridgePhase32NextGateDecisionPhase;

  readonly outcome: BridgePhase32GateOutcome;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly closureSnapshot: BridgePhase32ClosureSnapshot;

  readonly nextAllowedStep: BridgePhase32NextAllowedStep;

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
