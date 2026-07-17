/**
 * canonicalizeBridgeContractV1.js — Phase 34-D-S1
 *
 * Deterministic semantic canonicalization of BRIDGE_CONTRACT_V1.
 *
 * Algorithm:
 *   1. Recursively sort object keys.
 *   2. Preserve array order exactly.
 *   3. Serialize with JSON.stringify without whitespace.
 *   4. Calculate SHA-256 of the resulting UTF-8 text.
 *
 * Pure. No runtime, transport, persistence, or mutation behaviour.
 */

import { createHash } from 'node:crypto';

import { BRIDGE_CONTRACT_V1 } from './bridgeContractV1.js';

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object') {
    const sortedKeys = Object.keys(value).sort();
    const result = {};
    for (const key of sortedKeys) {
      result[key] = sortKeysDeep(value[key]);
    }
    return result;
  }
  return value;
}

export function canonicalizeBridgeContractV1(contract = BRIDGE_CONTRACT_V1) {
  const sorted = sortKeysDeep(contract);
  return JSON.stringify(sorted);
}

export function computeBridgeContractV1SemanticHash(contract = BRIDGE_CONTRACT_V1) {
  const canonicalJson = canonicalizeBridgeContractV1(contract);
  return createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}

export function getBridgeContractV1SemanticHashSummary(contract = BRIDGE_CONTRACT_V1) {
  return Object.freeze({
    contractId: contract.contractId,
    schemaVersion: contract.schemaVersion,
    semanticHash: computeBridgeContractV1SemanticHash(contract),
  });
}