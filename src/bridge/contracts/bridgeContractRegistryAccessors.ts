import {
  createBridgeContractRegistrySnapshot,
} from "./bridgeContractRegistry";

import type {
  BridgeContractRegistryEntry,
  BridgeContractRegistryName,
  BridgeContractRegistrySnapshot,
} from "./bridgeContractRegistryTypes";

export interface BridgeContractRegistryAccessResult {
  readonly name: BridgeContractRegistryName;

  readonly entry: BridgeContractRegistryEntry;

  readonly enabled: false;

  readonly executionAllowed: false;

  readonly operationalCapabilityActive: false;

  readonly blocked: true;

  readonly reason: string;
}

function assertRegistryRemainsDisabled(
  registry: BridgeContractRegistrySnapshot
): void {

  if (
    registry.enabled !== false ||
    registry.executionAllowed !== false ||
    registry.registryActive !== false ||
    registry.allContractsDisabled !== true ||
    registry.activeContracts !== 0 ||
    registry.operationalCapabilityActive !== false ||
    registry.safeToRunOperationalBridge !== false
  ) {
    throw new Error(
      "Bridge contract registry accessor detected operational registry drift."
    );
  }
}

function assertEntryRemainsDisabled(
  entry: BridgeContractRegistryEntry
): void {

  if (
    entry.enabled !== false ||
    entry.executionAllowed !== false ||
    entry.operationalCapabilityActive !== false ||
    entry.snapshot.enabled !== false ||
    entry.snapshot.executionAllowed !== false
  ) {
    throw new Error(
      `Bridge contract registry accessor detected operational contract drift: ${entry.name}`
    );
  }
}

export function getBridgeContractRegistrySnapshot(): BridgeContractRegistrySnapshot {

  const registry = createBridgeContractRegistrySnapshot();

  assertRegistryRemainsDisabled(registry);

  return registry;
}

export function getAllBridgeContractRegistryEntries(): readonly BridgeContractRegistryEntry[] {

  const registry = getBridgeContractRegistrySnapshot();

  registry.contracts.forEach(assertEntryRemainsDisabled);

  return registry.contracts;
}

export function getBridgeContractRegistryEntry(
  name: BridgeContractRegistryName
): BridgeContractRegistryEntry {

  const entry = getAllBridgeContractRegistryEntries().find(
    (contract) => contract.name === name
  );

  if (!entry) {
    throw new Error(
      `Bridge contract registry entry not found: ${name}`
    );
  }

  assertEntryRemainsDisabled(entry);

  return entry;
}

export function isBridgeContractRegistryEntryEnabled(
  name: BridgeContractRegistryName
): false {

  const entry = getBridgeContractRegistryEntry(name);

  assertEntryRemainsDisabled(entry);

  return false;
}

export function getBridgeContractRegistryAccessResult(
  name: BridgeContractRegistryName
): BridgeContractRegistryAccessResult {

  const entry = getBridgeContractRegistryEntry(name);

  assertEntryRemainsDisabled(entry);

  return {
    name,
    entry,
    enabled: false,
    executionAllowed: false,
    operationalCapabilityActive: false,
    blocked: true,
    reason: `Bridge contract registry entry "${name}" is disabled and blocked in Phase 32 C2.`,
  };
}

export function getAllBridgeContractRegistryAccessResults(): readonly BridgeContractRegistryAccessResult[] {

  return getAllBridgeContractRegistryEntries().map((entry) =>
    getBridgeContractRegistryAccessResult(entry.name)
  );
}
