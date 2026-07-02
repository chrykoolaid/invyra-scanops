import type {
  BridgePhase33FixtureImplementationIndexReport,
} from "./bridgePhase33FixtureImplementationIndexTypes";

export type BridgePhase33FixtureEvidenceSummaryPhase = "33.A16";

export type BridgePhase33FixtureEvidenceSummaryStatus = "fixture-summary-defined-read-only";

export interface BridgePhase33FixtureEvidenceSummaryEntry {
  readonly name: string;

  readonly summaryKey: string;

  readonly sourceKey: string;

  readonly targetKey: string;

  readonly assertionKey: string;

  readonly descriptorOnly: true;

  readonly active: false;
}

export interface BridgePhase33FixtureEvidenceSummaryTotals {
  readonly summaryEntries: 8;

  readonly descriptorOnlyEntries: 8;

  readonly activeEntries: 0;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33FixtureEvidenceSummaryReport {
  readonly phase: BridgePhase33FixtureEvidenceSummaryPhase;

  readonly status: BridgePhase33FixtureEvidenceSummaryStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly implementationIndex: BridgePhase33FixtureImplementationIndexReport;

  readonly summaryEntries: readonly BridgePhase33FixtureEvidenceSummaryEntry[];

  readonly totals: BridgePhase33FixtureEvidenceSummaryTotals;

  readonly summaryDefined: true;

  readonly implementationIndexDefined: true;

  readonly descriptorOnly: true;

  readonly readyForFixtureExecution: false;

  readonly crossRepoValidationConfirmed: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly persistenceAllowed: false;

  readonly inventoryMutationAllowed: false;

  readonly scanOpsMutationAllowed: false;

  readonly nextAllowedStep: "phase-33-a17-fixture-evidence-readiness-review";

  readonly reason: string;
}
