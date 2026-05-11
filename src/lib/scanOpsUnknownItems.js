import { SCANOPS_USER_CONTEXT } from "./scanOpsInventoryFixtures";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "./scanOpsEvents";

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
    status: "needs_review",
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
    status: "needs_review",
    creates_product: false,
    applies_stock_directly: false,
    applies_price_directly: false,
    supervisor_review_required: true,
  });
  return evidence;
}

export function getUnknownItemEvidence() {
  return read();
}
