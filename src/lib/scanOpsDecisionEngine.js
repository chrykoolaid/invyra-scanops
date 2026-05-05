import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "./scanOpsEvents";
import { buildDecisionItemIdentity, getDecisionForWorkflow } from "./scanOpsDecisionRules";

export function createDecisionRecommendation(input) { return getDecisionForWorkflow(input || {}); }

export function buildDecisionEventPayload(decision, extra = {}) {
  if (!decision) return extra;
  return {
    source_module: extra.source_module || "Decision Engine",
    decision_id: decision.decisionId,
    recommendation_type: decision.recommendationType,
    recommended_action: decision.recommendedAction,
    confidence: decision.confidence,
    reason_text: decision.reasonText,
    risk_level: decision.riskLevel,
    required_role: decision.requiredRole,
    linked_workflow: decision.linkedWorkflow,
    event_to_create: decision.eventToCreate,
    task_to_create: decision.taskToCreate,
    task_priority: decision.taskPriority,
    supervisor_review_required: decision.supervisorReviewRequired,
    no_stock_mutation: decision.noStockMutation,
    source_workflow: decision.sourceWorkflow,
    ...decision.itemIdentity,
    ...extra,
  };
}

const EVENT_BY_OUTCOME = {
  generated: SCANOPS_EVENT_TYPES.DECISION_RECOMMENDATION_GENERATED,
  accepted: SCANOPS_EVENT_TYPES.DECISION_RECOMMENDATION_ACCEPTED,
  rejected: SCANOPS_EVENT_TYPES.DECISION_RECOMMENDATION_REJECTED,
  overridden: SCANOPS_EVENT_TYPES.DECISION_RECOMMENDATION_OVERRIDDEN,
  supervisor_review: SCANOPS_EVENT_TYPES.DECISION_SUPERVISOR_REVIEW_REQUIRED,
  task_created: SCANOPS_EVENT_TYPES.DECISION_TASK_CREATED,
  reason_viewed: SCANOPS_EVENT_TYPES.DECISION_REASON_VIEWED,
};

export function recordDecisionEvent(decision, outcome = "generated", extra = {}) {
  const eventType = EVENT_BY_OUTCOME[outcome] || SCANOPS_EVENT_TYPES.DECISION_RECOMMENDATION_GENERATED;
  return createScanOpsEvent(eventType, buildDecisionEventPayload(decision, { status: extra.status || outcome, decision_outcome: outcome, ...extra }));
}

export function buildDecisionLinkedPayload(decision, decisionEvent, extra = {}) {
  return {
    linked_decision_id: decision?.decisionId || null,
    linked_decision_event_id: decisionEvent?.event_id || null,
    decision_recommendation_type: decision?.recommendationType || null,
    decision_reason_text: decision?.reasonText || null,
    decision_confidence: decision?.confidence || null,
    decision_risk_level: decision?.riskLevel || null,
    no_stock_mutation: true,
    ...extra,
  };
}

export function getDecisionItemIdentityPayload(item) { return buildDecisionItemIdentity(item); }
