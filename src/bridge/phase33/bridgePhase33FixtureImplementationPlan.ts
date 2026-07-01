import {
  createBridgePhase33ValidationReadinessSnapshot,
} from "./bridgePhase33ValidationReadinessSnapshot";

import type {
  BridgePhase33FixtureImplementationPlan,
  BridgePhase33FixtureImplementationPlanStep,
} from "./bridgePhase33FixtureImplementationPlanTypes";

export const BRIDGE_PHASE_33_FIXTURE_IMPLEMENTATION_PLAN_STEPS: readonly BridgePhase33FixtureImplementationPlanStep[] = Object.freeze([
  { name: "Create ScanOps fixture source files", planned: true, active: false },
  { name: "Create Inventory fixture source files", planned: true, active: false },
  { name: "Create shared assertion descriptors", planned: true, active: false },
  { name: "Create counterpart key matching rules", planned: true, active: false },
  { name: "Create fixture manifest descriptors", planned: true, active: false },
  { name: "Create report-only comparison helpers", planned: true, active: false },
  { name: "Create cross-repo evidence summary shape", planned: true, active: false },
  { name: "Create later execution gate checklist", planned: true, active: false },
]);

export function createBridgePhase33FixtureImplementationPlan(): BridgePhase33FixtureImplementationPlan {

  const readinessSnapshot = createBridgePhase33ValidationReadinessSnapshot();

  if (
    readinessSnapshot.readyForFixtureImplementation !== true ||
    readinessSnapshot.readyForFixtureExecution !== false ||
    readinessSnapshot.crossRepoValidationConfirmed !== false ||
    readinessSnapshot.bridgeActivationAllowed !== false ||
    readinessSnapshot.safeToRunOperationalBridge !== false ||
    readinessSnapshot.persistenceAllowed !== false ||
    readinessSnapshot.inventoryMutationAllowed !== false ||
    readinessSnapshot.scanOpsMutationAllowed !== false ||
    readinessSnapshot.totals.activationStepsAllowed !== 0
  ) {
    throw new Error(
      "Bridge Phase 33 fixture implementation plan detected readiness snapshot drift."
    );
  }

  if (
    BRIDGE_PHASE_33_FIXTURE_IMPLEMENTATION_PLAN_STEPS.length !== 8 ||
    BRIDGE_PHASE_33_FIXTURE_IMPLEMENTATION_PLAN_STEPS.some(
      (step) => step.planned !== true || step.active !== false
    )
  ) {
    throw new Error(
      "Bridge Phase 33 fixture implementation plan detected step drift."
    );
  }

  return {
    phase: "33.A13",
    status: "fixture-implementation-plan-defined-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    readinessSnapshot,
    plannedSteps: BRIDGE_PHASE_33_FIXTURE_IMPLEMENTATION_PLAN_STEPS,
    totals: {
      plannedSteps: 8,
      activeSteps: 0,
      activationStepsAllowed: 0,
    },
    implementationPlanDefined: true,
    readyForFixtureImplementation: true,
    readyForFixtureExecution: false,
    crossRepoValidationConfirmed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "phase-33-a14-fixture-implementation-skeletons",
    reason:
      "Phase 33 A13 defines the fixture implementation plan only. Fixture execution, persistence, mutation, and bridge activation remain separate future gates.",
  };
}
