import { SCANOPS_USER_CONTEXT } from "./scanOpsInventoryFixtures";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "./scanOpsEvents";
import { TASK_DUE_STATES, TASK_PRIORITIES, TASK_TYPES, upsertDerivedTaskFromSource } from "./scanOpsTasks";

export const UNKNOWN_ITEM_REVIEW_STATES = {
  NEEDS_REVIEW: "needs_review",
  LINKED_TO_EXISTING_PRODUCT: "linked_to_existing_product",
  REJECTED: "rejected",
  ESCALATED: "escalated",
  DEFERRED: "deferred",
};

const STORAGE_KEY = "invyra_scanops_unknown_item_evidence_v1";

function read() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(records) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

function makeId() {
  return `unknown_item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createUnknownItemEvidence({ enteredCode, sourceWorkflow = "ScanOps", note = "" }) {
  const code = String(enteredCode || "").trim();
  if (!code) return null;

  const evidence = {
    evidenceId: makeId(),
    enteredCode: code,
    sourceWorkflow,
    sourceModule: sourceWorkflow,
    createdBy: SCANOPS_USER_CONTEXT.user_name,
    createdRole: SCANOPS_USER_CONTEXT.role,
    createdAt: new Date().toISOString(),
    note,
    status: UNKNOWN_ITEM_REVIEW_STATES.NEEDS_REVIEW,
    createsProduct: false,
    appliesStockDirectly: false,
    appliesPriceDirectly: false,
  };

  write([evidence, ...read()].slice(0, 80));
  createScanOpsEvent(SCANOPS_EVENT_TYPES.UNKNOWN_ITEM_EVIDENCE_CREATED, {
    source_module: sourceWorkflow,
    unknown_item_evidence_id: evidence.evidenceId,
    sourceRequestId: evidence.evidenceId,
    entered_code: evidence.enteredCode,
    item_name: "Unknown item evidence",
    status: UNKNOWN_ITEM_REVIEW_STATES.NEEDS_REVIEW,
    creates_product: false,
    applies_stock_directly: false,
    applies_price_directly: false,
    supervisor_review_required: true,
  });
  upsertDerivedTaskFromSource({
    taskType: TASK_TYPES.PRODUCT_IDENTITY_REVIEW,
    task_kind: "unknown_item_review",
    title: "Review unknown barcode",
    description: `${evidence.enteredCode} needs product identity review.`,
    action_needed: "Open Product Identity Review and decide whether this evidence needs linking, rejection, deferral, or escalation. Task completion does not create a product.",
    evidence_required: "Review note or escalation reason",
    priority: TASK_PRIORITIES.HIGH,
    due_state: TASK_DUE_STATES.TODAY,
    source_type: "unknown_item_evidence",
    source_id: evidence.evidenceId,
    source_ref: evidence.enteredCode,
    source_module: "Product Identity Review",
    source_status_snapshot: UNKNOWN_ITEM_REVIEW_STATES.NEEDS_REVIEW,
    source_item_snapshot: { unknown_barcode: evidence.enteredCode, captured_from: sourceWorkflow, note },
    assigned_department: SCANOPS_USER_CONTEXT.department || "Grocery",
    assigned_role: "Staff",
    assigned_user_id: "team",
    assigned_user_name: `${SCANOPS_USER_CONTEXT.department || "Grocery"} Team`,
    linkedWorkflow: "/product-identity-review",
    linkedWorkflowLabel: "Product Identity Review · Unknown evidence",
    linkedContext: { evidenceId: evidence.evidenceId },
  });
  return evidence;
}

export function getUnknownItemEvidence() {
  return read();
}


export function updateUnknownItemEvidence(evidenceId, patch = {}) {
  if (!evidenceId) return null;
  const records = read();
  const next = records.map((record) => (record.evidenceId === evidenceId ? { ...record, ...patch } : record));
  write(next);
  return next.find((record) => record.evidenceId === evidenceId) || null;
}
