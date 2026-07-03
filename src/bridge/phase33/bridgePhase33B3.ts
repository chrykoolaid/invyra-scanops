import {
  createBridgePhase33B2Report,
} from "./bridgePhase33B2";

export function createBridgePhase33B3Report() {
  const b2 = createBridgePhase33B2Report();

  return Object.freeze({
    phase: "33.B3",
    status: "b3-readiness-summary-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    summaryInputs: Object.freeze([
      "33.B1 bridge readiness planning baseline",
      "33.B2 readiness map",
    ]),
    b2,
    bridgeState: Object.freeze({
      bridgeActivationAllowed: false,
      transportActivationAllowed: false,
      fixtureExecutionAllowed: false,
      persistenceAllowed: false,
      synchronizationAllowed: false,
      queueProcessingAllowed: false,
      inventoryMutationAllowed: false,
      scanOpsMutationAllowed: false,
    }),
    protectedDomains: Object.freeze([
      "stock",
      "ledger",
      "pricing",
      "POS",
      "orders",
      "approvals",
      "Item Master",
    ]),
    totals: Object.freeze({
      summaryInputs: 2,
      activationStepsAllowed: 0,
      mutationDomainsAllowed: 0,
    }),
    markerDefined: true,
    readinessSummaryDefined: true,
    readyForNextPlanning: true,
    readyForFixtureExecution: false,
    nextAllowedStep: "phase-33-b4-summary",
  });
}
