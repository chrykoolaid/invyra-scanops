import type {
  BridgePhase32NextGateDecision,
} from "./bridgePhase32NextGateDecisionTypes";

export type BridgePhase32CleanupReportPhase = "32.CLEANUP";

export type BridgePhase32CleanupStatus = "complete-no-activation";

export interface BridgePhase32CleanupReportTotals {
  readonly mergedExternalSurfaceCount: 5;

  readonly pendingExternalDraftSurfaceCount: 0;

  readonly packageRegistrationChangesApplied: true;

  readonly openPullRequestsAtCleanup: 0;
}

export interface BridgePhase32CleanupReport {
  readonly phase: BridgePhase32CleanupReportPhase;

  readonly status: BridgePhase32CleanupStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly nextGateDecision: BridgePhase32NextGateDecision;

  readonly totals: BridgePhase32CleanupReportTotals;

  readonly phase32ExportsConsistent: true;

  readonly packageValidationScriptsRegistered: true;

  readonly openPullRequestsChecked: true;

  readonly phase32Closed: true;

  readonly phase32RuntimeStillInactive: true;

  readonly phase32ReadyForActivation: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly phase33GateBlockedUntilCleanup: false;

  readonly phase33GateRequiresSeparateDecision: true;

  readonly reason: string;
}
