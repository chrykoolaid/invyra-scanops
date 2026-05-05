import { createDecisionRecommendation } from "./scanOpsDecisionEngine";
import { resolveInventoryIdentity } from "./inventorySystemAdapter";
import { getExpiryStatus } from "./scanOpsRules";

const TODAY = "2026-05-05";

export const SCANOPS_DECISION_FIXTURES = [
  createDecisionRecommendation({ workflow: "gap_scan", item: resolveInventoryIdentity("930000000001") }),
  createDecisionRecommendation({ workflow: "markdown", item: resolveInventoryIdentity("930000000004"), context: { reasonId: "near_expiry" } }),
  createDecisionRecommendation({ workflow: "waste", item: resolveInventoryIdentity("930000000008"), context: { reasonId: "expired", quantity: 1 } }),
  createDecisionRecommendation({ workflow: "expiry_freshness", item: resolveInventoryIdentity("930000000004"), context: { expiryStatus: getExpiryStatus("2026-05-06", TODAY), freshnessId: "near_expiry" } }),
];

export function getDecisionFixtureSummary() {
  return SCANOPS_DECISION_FIXTURES.map((decision) => ({ id: decision.decisionId, type: decision.recommendationType, action: decision.recommendedAction, confidence: decision.confidence, risk: decision.riskLevel }));
}
