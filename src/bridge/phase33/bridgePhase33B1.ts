import {
  createBridgePhase33A29Report,
} from "./bridgePhase33A29";

export function createBridgePhase33B1Report() {
  const a29 = createBridgePhase33A29Report();

  return Object.freeze({
    phase: "33.B1",
    status: "b1-ready-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    a29,
    totals: Object.freeze({
      planningItems: 4,
      activationStepsAllowed: 0,
    }),
    markerDefined: true,
    readyForNextPlanning: true,
    readyForFixtureExecution: false,
    nextAllowedStep: "phase-33-b2-summary",
  });
}
