import {
  createBridgePhase33A24Report,
} from "./bridgePhase33A24";

export function createBridgePhase33A25Report() {
  const a24 = createBridgePhase33A24Report();

  return Object.freeze({
    phase: "33.A25",
    status: "a25-defined-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    a24,
    totals: Object.freeze({
      reviewItems: 5,
      readyItems: 3,
      blockedItems: 2,
      activationStepsAllowed: 0,
    }),
    summaryDefined: true,
    readyForNextPlanning: true,
    readyForFixtureExecution: false,
    nextAllowedStep: "phase-33-a26-summary",
  });
}
