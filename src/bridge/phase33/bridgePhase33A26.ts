import {
  createBridgePhase33A25Report,
} from "./bridgePhase33A25";

export function createBridgePhase33A26Report() {
  const a25 = createBridgePhase33A25Report();

  return Object.freeze({
    phase: "33.A26",
    status: "a26-closure-defined-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    a25,
    totals: Object.freeze({
      reviewItems: 5,
      readyItems: 3,
      blockedItems: 2,
      activationStepsAllowed: 0,
    }),
    closureDefined: true,
    summaryDefined: true,
    readyForNextPlanning: true,
    readyForFixtureExecution: false,
    nextAllowedStep: "phase-33-a27-summary",
  });
}
