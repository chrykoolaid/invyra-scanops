import {
  createBridgeManualSyncBoundaryReport,
} from "./bridgeManualSyncBoundaryReport";

import type {
  BridgeExternalBridgeSurfaceEntry,
  BridgePhase32ValidationEntry,
  BridgePhase32ValidationManifest,
} from "./bridgePhase32ValidationManifestTypes";

export const BRIDGE_PHASE_32_VALIDATION_ENTRIES: readonly BridgePhase32ValidationEntry[] = Object.freeze([
  { scriptPath: "scripts/validate-scanops-bridge-runtime-gate-snapshot.mjs", scope: "runtime", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-feature-gate-accessors.mjs", scope: "runtime", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-runtime-capability-guard.mjs", scope: "runtime", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-runtime-safety-report.mjs", scope: "runtime", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-discovery-contract-skeleton.mjs", scope: "contract", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-qr-pairing-contract-skeleton.mjs", scope: "contract", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-trusted-device-registry-contract.mjs", scope: "contract", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-transport-contract-skeleton.mjs", scope: "contract", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-outbound-queue-contract-skeleton.mjs", scope: "contract", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-inbound-inbox-contract-skeleton.mjs", scope: "contract", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-receipt-contract-skeleton.mjs", scope: "contract", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-acknowledgement-contract-skeleton.mjs", scope: "contract", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-diagnostics-contract-skeleton.mjs", scope: "contract", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-recovery-contract-skeleton.mjs", scope: "contract", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-contract-registry-snapshot.mjs", scope: "registry", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-contract-registry-accessors.mjs", scope: "registry", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-contract-registry-index.mjs", scope: "registry", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-contract-registry-readiness-report.mjs", scope: "registry", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-contract-registry-readiness-index.mjs", scope: "registry", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-manual-sync-boundary-report.mjs", scope: "boundary", status: "required", packageRegistrationReviewed: false },
  { scriptPath: "scripts/validate-scanops-bridge-boundary-index.mjs", scope: "boundary", status: "required", packageRegistrationReviewed: false },
]);

export const BRIDGE_EXTERNAL_BRIDGE_SURFACES: readonly BridgeExternalBridgeSurfaceEntry[] = Object.freeze([
  { phase: "8", label: "Manual sync execution layer", phase32Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "9", label: "Sync control surface", phase32Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "10", label: "Receipt application boundary", phase32Owned: false, requiresSeparateGovernanceReview: true },
]);

export function createBridgePhase32ValidationManifest(): BridgePhase32ValidationManifest {

  const boundaryReport = createBridgeManualSyncBoundaryReport();

  if (
    boundaryReport.safeToRunOperationalBridge !== false ||
    boundaryReport.bridgeActivationAllowed !== false ||
    boundaryReport.phase32ReadyForActivation !== false ||
    boundaryReport.phase32RuntimeStillInactive !== true ||
    boundaryReport.phase32BoundaryAcknowledged !== true
  ) {
    throw new Error(
      "Bridge Phase 32 validation manifest detected boundary drift."
    );
  }

  if (
    BRIDGE_EXTERNAL_BRIDGE_SURFACES.length !== 3 ||
    BRIDGE_EXTERNAL_BRIDGE_SURFACES.some((surface) => surface.phase32Owned !== false)
  ) {
    throw new Error(
      "Bridge Phase 32 validation manifest detected external surface drift."
    );
  }

  if (
    BRIDGE_PHASE_32_VALIDATION_ENTRIES.some(
      (entry) => entry.packageRegistrationReviewed !== false
    )
  ) {
    throw new Error(
      "Bridge Phase 32 validation manifest cleanup pass was applied too early."
    );
  }

  return {
    phase: "32.C8",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    boundaryReport,
    validations: BRIDGE_PHASE_32_VALIDATION_ENTRIES,
    externalBridgeSurfaces: BRIDGE_EXTERNAL_BRIDGE_SURFACES,
    totals: {
      validationCount: BRIDGE_PHASE_32_VALIDATION_ENTRIES.length,
      externalSurfaceCount: 3,
      packageRegistrationChangesApplied: false,
    },
    phase32RuntimeStillInactive: true,
    phase32ReadyForActivation: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    cleanupPassDeferred: true,
    reason:
      "Phase 32 C8 records the required validation surface and defers package registration cleanup until after C10.",
  };
}
