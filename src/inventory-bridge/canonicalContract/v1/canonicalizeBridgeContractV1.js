/**
 * canonicalizeBridgeContractV1.js — Phase 34-D-S
 *
 * Deterministic semantic canonicalization of the Bridge Contract v1.
 *
 * Algorithm:
 *   1. Parse the canonical JSON contract.
 *   2. Recursively sort object keys.
 *   3. Preserve array order exactly.
 *   4. Serialize with JSON.stringify without whitespace.
 *   5. Calculate SHA-256 of the resulting UTF-8 text.
 *
 * Pure. No runtime, transport, persistence, or mutation behaviour.
 */

import {
  createHash,
} from 'node:crypto';

import { CANONICAL_CONTRACT } from './bridgeContractV1.js';

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

export function canonicalizeBridgeContractV1(contract = CANONICAL_CONTRACT) {
  const sorted = sortKeysDeep(contract);
  return JSON.stringify(sorted);
}

export function computeBridgeContractV1SemanticHash(contract = CANONICAL_CONTRACT) {
  const canonicalJson = canonicalizeBridgeContractV1(contract);
  return createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}

export function getBridgeContractV1SemanticHashSummary(contract = CANONICAL_CONTRACT) {
  return Object.freeze({
    contractId: contract.contractId,
    schemaVersion: contract.schemaVersion,
    semanticHash: computeBridgeContractV1SemanticHash(contract),
  });
}