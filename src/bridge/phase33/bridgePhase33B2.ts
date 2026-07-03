import {
  createBridgePhase33B1Report,
} from "./bridgePhase33B1";

export function createBridgePhase33B2Report() {
  const b1 = createBridgePhase33B1Report();

  return Object.freeze({
    phase: "33.B2",
    status: "b2-ready-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    b1,
    totals: Object.freeze({
      mappedItems: 4,
      activationStepsAllowed: 0,
    }),
    markerDefined: true,
    readyForNextPlanning: true,
    readyForFixtureExecution: false,
    nextAllowedStep: "phase-33-b3-summary",
  });
}
