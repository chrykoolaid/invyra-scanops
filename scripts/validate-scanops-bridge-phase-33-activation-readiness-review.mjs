import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const errors = [];
const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertIncludes(content, expected, message) {
  if (!content.includes(expected)) {
    errors.push(message);
  }
}

function assertNotIncludes(content, forbidden, message) {
  if (content.includes(forbidden)) {
    errors.push(message);
  }
}

const reviewTypes = read('src/bridge/phase33/bridgePhase33ActivationReadinessReviewTypes.ts');
const review = read('src/bridge/phase33/bridgePhase33ActivationReadinessReview.ts');
const planningBundle = read('src/bridge/phase33/bridgePhase33PlanningBundle.ts');

assertIncludes(reviewTypes, 'export type BridgePhase33ActivationReadinessReviewPhase = "33.A6";', 'review must identify Phase 33 A6');
assertIncludes(reviewTypes, 'not-ready-for-activation', 'review status must remain not ready for activation');
assertIncludes(reviewTypes, 'export type BridgePhase33ReadinessDecision = "blocked";', 'review decision must be blocked');
assertIncludes(reviewTypes, 'readonly readinessChecks: 10;', 'review totals must type ten checks');
assertIncludes(reviewTypes, 'readonly readyChecks: 3;', 'review totals must type three ready checks');
assertIncludes(reviewTypes, 'readonly blockingChecks: 7;', 'review totals must type seven blocking checks');
assertIncludes(reviewTypes, 'readonly activationStepsAllowed: 0;', 'review totals must allow zero activation steps');
assertIncludes(reviewTypes, 'readonly inventoryCounterpartConfirmed: false;', 'Inventory counterpart must remain unconfirmed');
assertIncludes(reviewTypes, 'readonly crossRepoValidationConfirmed: false;', 'cross-repo validation must remain unconfirmed');
assertIncludes(reviewTypes, 'readonly activationGateApproved: false;', 'activation gate must remain unapproved');
assertIncludes(reviewTypes, 'readonly bridgeActivationAllowed: false;', 'bridge activation must remain disallowed');
assertIncludes(reviewTypes, 'readonly safeToRunOperationalBridge: false;', 'operational bridge must remain unsafe');
assertIncludes(reviewTypes, 'readonly executionAllowed: false;', 'execution must remain disallowed');
assertIncludes(reviewTypes, 'readonly persistenceAllowed: false;', 'persistence must remain disallowed');
assertIncludes(reviewTypes, 'readonly inventoryMutationAllowed: false;', 'Inventory mutation must remain disallowed');
assertIncludes(reviewTypes, 'readonly scanOpsMutationAllowed: false;', 'ScanOps mutation must remain disallowed');
assertIncludes(reviewTypes, 'readonly nextAllowedStep: "phase-33-a7-inventory-counterpart-baseline";', 'review must route to A7 counterpart baseline');

assertIncludes(review, 'createBridgePhase33ActivationReadinessReview', 'review factory must exist');
assertIncludes(review, 'createBridgePhase33PlanningBundle()', 'review must build on A2-A5 planning bundle');
assertIncludes(review, 'phase: "33.A6"', 'review must return Phase 33 A6');
assertIncludes(review, 'status: "not-ready-for-activation"', 'review must return blocked readiness status');
assertIncludes(review, 'decision: "blocked"', 'review must return blocked decision');
assertIncludes(review, 'readinessChecks: 10', 'review must return ten readiness checks');
assertIncludes(review, 'readyChecks: 3', 'review must return three ready checks');
assertIncludes(review, 'blockingChecks: 7', 'review must return seven blocking checks');
assertIncludes(review, 'activationStepsAllowed: 0', 'review must allow zero activation steps');
assertIncludes(review, 'inventoryCounterpartConfirmed: false', 'review must keep Inventory counterpart unconfirmed');
assertIncludes(review, 'crossRepoValidationConfirmed: false', 'review must keep cross-repo validation unconfirmed');
assertIncludes(review, 'activationGateApproved: false', 'review must keep activation gate unapproved');
assertIncludes(review, 'bridgeActivationAllowed: false', 'review must keep bridge activation disallowed');
assertIncludes(review, 'safeToRunOperationalBridge: false', 'review must keep operational bridge unsafe');
assertIncludes(review, 'executionAllowed: false', 'review must keep execution disallowed');
assertIncludes(review, 'persistenceAllowed: false', 'review must keep persistence disallowed');
assertIncludes(review, 'inventoryMutationAllowed: false', 'review must keep Inventory mutation disallowed');
assertIncludes(review, 'scanOpsMutationAllowed: false', 'review must keep ScanOps mutation disallowed');
assertIncludes(review, 'nextAllowedStep: "phase-33-a7-inventory-counterpart-baseline"', 'review must route to A7 counterpart baseline');

for (const expected of [
  'Inventory counterpart baseline confirmed',
  'Cross-repo validation fixtures confirmed',
  'Transport activation gate approved',
  'Persistence policy approved',
  'Receipt application authority confirmed',
  'Audit and rollback plan confirmed',
  'Operational activation approval granted',
]) {
  assertIncludes(review, expected, `review must include blocking check ${expected}`);
}

assertIncludes(planningBundle, 'phase: "33.A2-A5"', 'review must build on A2-A5 planning bundle');
assertIncludes(planningBundle, 'planningOnly: true', 'planning bundle must remain planning-only');
assertIncludes(planningBundle, 'activationStepsAllowed: 0', 'planning bundle must allow zero activation steps');

for (const forbidden of [
  'not-ready-for-activation: false',
  'decision: "approved"',
  'inventoryCounterpartConfirmed: true',
  'crossRepoValidationConfirmed: true',
  'activationGateApproved: true',
  'bridgeActivationAllowed: true',
  'safeToRunOperationalBridge: true',
  'executionAllowed: true',
  'persistenceAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'activationStepsAllowed: 1',
]) {
  assertNotIncludes(reviewTypes, forbidden, `review types must not contain ${forbidden}`);
  assertNotIncludes(review, forbidden, `review implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 33 A6 validates activation readiness is blocked until required counterpart and cross-repo gates are complete.');
