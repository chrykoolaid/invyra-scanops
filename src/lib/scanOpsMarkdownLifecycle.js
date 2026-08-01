import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "./scanOpsEvents";
import { getScanOpsSession } from "./scanOpsSession";
import { getCurrentPriceSnapshot, getCurrencySymbol, getOptionLabel, MARKDOWN_REASON_OPTIONS } from "./scanOpsRequestLifecycle";
import {
  buildMarkdownBatchKey,
  DEFAULT_MARKDOWN_POLICY,
  evaluateMarkdownSchedule,
  MARKDOWN_STAGES,
  normalizeMarkdownPolicy,
  toDateOnly,
  validateMarkdownInput,
} from "./scanOpsMarkdownPolicy";
import { printMarkdownLabels } from "./scanOpsMarkdownPrinter";

const SUBMISSIONS_KEY = "invyra_scanops_markdown_submissions_v2";
const POLICY_KEY = "invyra_scanops_markdown_policy_v2";
const MAX_RECORDS = 300;

export const MARKDOWN_SUBMISSION_VERSION = "SCANOPS_MARKDOWN_SUBMISSION_V2";

export const MARKDOWN_PRINT_STATUSES = {
  PRINTING: "PRINTING",
  PRINTED: "PRINTED",
  PRINT_FAILED: "PRINT_FAILED",
  SUPERSEDED: "SUPERSEDED",
  SALE_BLOCKED_EXPIRED: "SALE_BLOCKED_EXPIRED",
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function safeRead(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
    return fallback;
  }
}

function safeWrite(key, value) {
  if (typeof window === "undefined") return value;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Unable to persist ${key}`, error);
  }
  return value;
}

function actorSnapshot() {
  const session = getScanOpsSession();
  return {
    requestedBy: session.actorName || session.user_name || "ScanOps operator",
    requestedByRole: session.actorRole || session.role || "Staff",
    requestedById: session.actorUserId || session.user_id || null,
    deviceId: session.deviceId || session.scannerId || null,
    sessionId: session.sessionId || null,
    locationId: session.locationId || session.storeId || session.location_id || "default-location",
    locationName: session.locationName || session.departmentName || session.storeName || null,
  };
}

function itemIdentity(item = {}) {
  return {
    itemId: item.id || item.itemId || item.item_id || item.canonicalItemId || item.canonical_item_id || null,
    itemName: item.name || item.itemName || item.item_name || "Scanned item",
    sku: item.sku || item.itemSku || item.item_sku || null,
    barcode: item.barcode || item.gtin || item.primaryBarcode || item.primary_barcode || null,
    department: item.department || item.category || "Store floor",
    shelfLocation: item.shelfLocation || item.shelf_location || item.location || item.shelf || null,
  };
}

function hasStableItemIdentity(identity) {
  return Boolean(identity.itemId || identity.sku || identity.barcode);
}

function saveSubmissions(rows) {
  return safeWrite(SUBMISSIONS_KEY, rows.slice(0, MAX_RECORDS));
}

function replaceSubmission(nextRecord) {
  const rows = getMarkdownSubmissions();
  const next = [nextRecord, ...rows.filter((row) => row.submissionId !== nextRecord.submissionId)];
  saveSubmissions(next);
  return nextRecord;
}

function markPriorRoundsSuperseded(record) {
  const rows = getMarkdownSubmissions();
  let changed = false;
  const next = rows.map((row) => {
    if (
      row.submissionId === record.submissionId
      || row.batchKey !== record.batchKey
      || row.printStatus !== MARKDOWN_PRINT_STATUSES.PRINTED
      || row.stage === record.stage
      || row.supersededBy
    ) return row;
    changed = true;
    return {
      ...row,
      printStatus: MARKDOWN_PRINT_STATUSES.SUPERSEDED,
      supersededBy: record.submissionId,
      supersededAt: nowIso(),
      updatedAt: nowIso(),
    };
  });
  if (changed) saveSubmissions(next);
}

function labelCopiesFor(quantity, quantityType) {
  const type = String(quantityType || "each").toLowerCase();
  if (["weight", "volume", "length"].includes(type)) return 1;
  return Math.max(1, Math.ceil(Number(quantity || 1)));
}

function calculatePrice(currentPrice, selectedMarkdownPercent) {
  const price = Number(currentPrice);
  const percent = Number(selectedMarkdownPercent);
  if (!Number.isFinite(price) || !Number.isFinite(percent)) return null;
  return Number(Math.max(0, price * (1 - percent / 100)).toFixed(2));
}

function writeLifecycleEvent(eventType, record, extra = {}) {
  createScanOpsEvent(eventType, {
    source_module: "Markdowns",
    workflow_type: "markdown_direct_submit_v2",
    markdown_submission_id: record.submissionId,
    markdown_record_id: record.submissionId,
    item_id: record.itemId,
    item_name: record.itemName,
    sku: record.sku,
    barcode: record.barcode,
    batch_key: record.batchKey,
    batch_lot: record.batchLot,
    expiry_date: record.expiryDate,
    final_sellable_date: record.finalSellableDate,
    markdown_stage: record.stage,
    selected_markdown_percent: record.selectedMarkdownPercent,
    selected_markdown_price: record.selectedMarkdownPrice,
    quantity: record.quantity,
    quantity_type: record.quantityType,
    label_copies: record.labelCopies,
    print_status: record.printStatus,
    applies_price_directly: false,
    product_master_price_unchanged: true,
    pos_base_price_unchanged: true,
    holiday_adjusted: record.holidayAdjusted,
    reduced_hours_adjusted: record.reducedHoursAdjusted,
    ...extra,
  });
}

export function getMarkdownSubmissions() {
  return safeRead(SUBMISSIONS_KEY, []);
}

export function getMarkdownPrintExceptions(locationId = actorSnapshot().locationId) {
  return getMarkdownSubmissions()
    .filter((record) => record.locationId === locationId && record.printStatus === MARKDOWN_PRINT_STATUSES.PRINT_FAILED)
    .sort((left, right) => String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || "")));
}

export function getMarkdownPolicy(locationId = actorSnapshot().locationId) {
  const policies = safeRead(POLICY_KEY, {});
  return normalizeMarkdownPolicy(policies[locationId] || DEFAULT_MARKDOWN_POLICY);
}

export function saveMarkdownPolicy(locationId, policyInput) {
  const policies = safeRead(POLICY_KEY, {});
  const next = {
    ...policies,
    [locationId || "default-location"]: normalizeMarkdownPolicy(policyInput),
  };
  safeWrite(POLICY_KEY, next);
  return next[locationId || "default-location"];
}

export function getMarkdownRoundsForBatch(batchKey) {
  return getMarkdownSubmissions()
    .filter((record) => record.batchKey === batchKey && [MARKDOWN_PRINT_STATUSES.PRINTED, MARKDOWN_PRINT_STATUSES.SUPERSEDED].includes(record.printStatus))
    .map((record) => ({
      stage: record.stage,
      selectedMarkdownPercent: record.selectedMarkdownPercent,
      createdAt: record.createdAt,
      submissionId: record.submissionId,
    }));
}

export function getMarkdownScheduleForItem({ item, batchLot, expiryDate, reference = new Date(), locationId } = {}) {
  const identity = itemIdentity(item);
  const actor = actorSnapshot();
  const resolvedLocationId = locationId || actor.locationId;
  const batchKey = buildMarkdownBatchKey({ ...identity, locationId: resolvedLocationId, batchLot, expiryDate });
  return {
    batchKey,
    ...evaluateMarkdownSchedule({
      expiryDate,
      reference,
      policy: getMarkdownPolicy(resolvedLocationId),
      rounds: getMarkdownRoundsForBatch(batchKey),
    }),
  };
}

async function attemptPrint(record, printer = null) {
  const attemptNumber = Number(record.printAttemptCount || 0) + 1;
  const printing = replaceSubmission({
    ...record,
    printStatus: MARKDOWN_PRINT_STATUSES.PRINTING,
    printAttemptCount: attemptNumber,
    lastPrintAttemptAt: nowIso(),
    printErrorCode: null,
    printErrorMessage: null,
    updatedAt: nowIso(),
  });
  writeLifecycleEvent(SCANOPS_EVENT_TYPES.LABEL_PRINT_REQUESTED, printing, { print_attempt: attemptNumber });

  const result = await printMarkdownLabels(printing, printer);
  if (!result.ok) {
    const failed = replaceSubmission({
      ...printing,
      printStatus: MARKDOWN_PRINT_STATUSES.PRINT_FAILED,
      printErrorCode: result.code || "PRINT_FAILED",
      printErrorMessage: result.message || "Labels could not be printed.",
      printerId: result.printer?.id || printing.printerId || null,
      printerName: result.printer?.name || printing.printerName || null,
      updatedAt: nowIso(),
    });
    writeLifecycleEvent(SCANOPS_EVENT_TYPES.MARKDOWN_PRINTER_HANDOFF_CREATED, failed, {
      print_succeeded: false,
      print_error_code: failed.printErrorCode,
      print_error_message: failed.printErrorMessage,
      retry_reuses_submission: true,
    });
    return { ok: false, code: failed.printErrorCode, message: failed.printErrorMessage, record: failed, printResult: result };
  }

  const printed = replaceSubmission({
    ...printing,
    printStatus: MARKDOWN_PRINT_STATUSES.PRINTED,
    printedAt: nowIso(),
    printedCopies: result.copies,
    printerId: result.printer?.id || null,
    printerName: result.printer?.name || null,
    nativePrintJobId: result.nativeJobId || null,
    printErrorCode: null,
    printErrorMessage: null,
    updatedAt: nowIso(),
  });
  markPriorRoundsSuperseded(printed);
  writeLifecycleEvent(SCANOPS_EVENT_TYPES.MARKDOWN_PRINTER_HANDOFF_CREATED, printed, {
    print_succeeded: true,
    printed_copies: printed.printedCopies,
    printer_id: printed.printerId,
    printer_name: printed.printerName,
    native_print_job_id: printed.nativePrintJobId,
  });
  return { ok: true, record: printed, printResult: result };
}

export async function submitMarkdownAndPrint({
  item,
  quantity,
  quantityType = "each",
  expiryDate,
  batchLot,
  reasonCode = "short_dated",
  selectedMarkdownPercent,
  notes = "",
  attributeSnapshot = null,
  idempotencyKey,
  printer = null,
  reference = new Date(),
} = {}) {
  const validation = validateMarkdownInput({ quantity, percent: selectedMarkdownPercent, expiryDate, batchLot });
  if (!validation.valid) {
    return { ok: false, code: validation.errors[0].code, message: validation.errors[0].message, validation };
  }

  const actor = actorSnapshot();
  const identity = itemIdentity(item);
  if (!hasStableItemIdentity(identity)) {
    return { ok: false, code: "ITEM_IDENTITY_REQUIRED", message: "The scanned item does not have a stable Inventory identity." };
  }

  const currentPrice = getCurrentPriceSnapshot(item);
  const numericCurrentPrice = Number(currentPrice);
  if (!Number.isFinite(numericCurrentPrice) || numericCurrentPrice < 0) {
    return { ok: false, code: "CURRENT_PRICE_REQUIRED", message: "A current authoritative price is required before a markdown label can be created." };
  }

  const schedule = getMarkdownScheduleForItem({ item, batchLot, expiryDate, reference, locationId: actor.locationId });
  if (schedule.stage === MARKDOWN_STAGES.EXPIRED) {
    const blocked = {
      submissionVersion: MARKDOWN_SUBMISSION_VERSION,
      submissionId: makeId("md_block"),
      batchKey: schedule.batchKey,
      ...identity,
      ...actor,
      quantity: Number(quantity),
      quantityType,
      expiryDate: toDateOnly(expiryDate),
      batchLot: String(batchLot).trim(),
      stage: MARKDOWN_STAGES.EXPIRED,
      printStatus: MARKDOWN_PRINT_STATUSES.SALE_BLOCKED_EXPIRED,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    writeLifecycleEvent(SCANOPS_EVENT_TYPES.MARKDOWN_WASTE_REVIEW_BLOCKED, blocked, { sale_blocked: true });
    return {
      ok: false,
      code: "EXPIRED_BATCH_SALE_BLOCKED",
      message: `This batch expired on ${blocked.expiryDate} and cannot be sold. Remove it from sale and follow the waste process.`,
      record: blocked,
    };
  }

  const stableKey = String(idempotencyKey || "").trim() || makeId("md_submit");
  const existingByIdempotency = getMarkdownSubmissions().find((record) => record.idempotencyKey === stableKey);
  if (existingByIdempotency) {
    if (existingByIdempotency.printStatus === MARKDOWN_PRINT_STATUSES.PRINT_FAILED) return attemptPrint(existingByIdempotency, printer);
    return {
      ok: existingByIdempotency.printStatus === MARKDOWN_PRINT_STATUSES.PRINTED,
      code: "DUPLICATE_SUBMIT_BLOCKED",
      message: "This submission has already been processed.",
      record: existingByIdempotency,
      duplicateBlocked: true,
    };
  }

  const existingRound = getMarkdownSubmissions().find((record) => (
    record.batchKey === schedule.batchKey
    && record.stage === schedule.stage
    && [MARKDOWN_PRINT_STATUSES.PRINTING, MARKDOWN_PRINT_STATUSES.PRINTED, MARKDOWN_PRINT_STATUSES.PRINT_FAILED].includes(record.printStatus)
  ));
  if (existingRound) {
    const needsRetry = existingRound.printStatus === MARKDOWN_PRINT_STATUSES.PRINT_FAILED;
    return {
      ok: false,
      code: needsRetry ? "MARKDOWN_PRINT_RETRY_REQUIRED" : "MARKDOWN_ROUND_ALREADY_ACTIVE",
      message: needsRetry
        ? "This batch already has an unprinted markdown record. Retry that print instead of creating another record."
        : "This markdown round is already active for the selected batch.",
      record: existingRound,
      duplicateBlocked: true,
    };
  }

  const percent = Number(selectedMarkdownPercent);
  const createdAt = nowIso();
  const record = {
    submissionVersion: MARKDOWN_SUBMISSION_VERSION,
    submissionId: makeId("md_sub"),
    idempotencyKey: stableKey,
    batchKey: schedule.batchKey,
    ...identity,
    ...actor,
    currentPrice: numericCurrentPrice,
    currency: getCurrencySymbol(item) || "₱",
    selectedMarkdownPercent: percent,
    selectedMarkdownPrice: calculatePrice(numericCurrentPrice, percent),
    quantity: Number(quantity),
    quantityType,
    labelCopies: labelCopiesFor(quantity, quantityType),
    expiryDate: toDateOnly(expiryDate),
    batchLot: String(batchLot).trim(),
    reasonCode,
    reasonLabel: getOptionLabel(MARKDOWN_REASON_OPTIONS, reasonCode),
    notes,
    stage: schedule.stage,
    suggestedPercent: schedule.suggestedPercent,
    scheduleDueState: schedule.dueState,
    finalSellableDate: schedule.finalSellableDate,
    initialMarkdownDate: schedule.initialMarkdownDate,
    holidayAdjusted: schedule.holidayAdjusted,
    reducedHoursAdjusted: schedule.reducedHoursAdjusted,
    insufficientSessionWindow: schedule.insufficientSessionWindow,
    effectiveEarlySessionTime: schedule.effectiveEarlySessionTime,
    effectiveFinalSessionTime: schedule.effectiveFinalSessionTime,
    policyVersion: schedule.policyVersion,
    attributeSnapshot,
    printStatus: MARKDOWN_PRINT_STATUSES.PRINTING,
    printAttemptCount: 0,
    appliesPriceDirectly: false,
    productMasterPriceChanged: false,
    posBasePriceChanged: false,
    createdAt,
    submittedAt: createdAt,
    updatedAt: createdAt,
  };

  replaceSubmission(record);
  writeLifecycleEvent(SCANOPS_EVENT_TYPES.MARKDOWN_REQUEST_CREATED, record, {
    direct_submit: true,
    approval_queue_used: false,
    automatic_print_requested: true,
  });
  return attemptPrint(record, printer);
}

export async function retryMarkdownPrint(submissionId, printer = null) {
  const record = getMarkdownSubmissions().find((entry) => entry.submissionId === submissionId);
  if (!record) return { ok: false, code: "MARKDOWN_NOT_FOUND", message: "The markdown submission could not be found." };
  if (record.printStatus === MARKDOWN_PRINT_STATUSES.PRINTED) return { ok: true, code: "ALREADY_PRINTED", record, duplicateBlocked: true };
  if (record.printStatus === MARKDOWN_PRINT_STATUSES.SUPERSEDED) return { ok: false, code: "MARKDOWN_SUPERSEDED", message: "This markdown round has been superseded and cannot be reprinted." };
  if (record.printStatus !== MARKDOWN_PRINT_STATUSES.PRINT_FAILED && record.printStatus !== MARKDOWN_PRINT_STATUSES.PRINTING) {
    return { ok: false, code: "MARKDOWN_NOT_PRINTABLE", message: "This markdown record is not eligible for printing." };
  }
  return attemptPrint(record, printer);
}

export function getMarkdownMonitorEntries(reference = new Date(), locationId = actorSnapshot().locationId) {
  const records = getMarkdownSubmissions().filter((record) => (
    record.locationId === locationId
    && [MARKDOWN_PRINT_STATUSES.PRINTED, MARKDOWN_PRINT_STATUSES.SUPERSEDED].includes(record.printStatus)
  ));
  const latestByBatch = new Map();
  records.forEach((record) => {
    const current = latestByBatch.get(record.batchKey);
    if (!current || String(record.createdAt).localeCompare(String(current.createdAt)) > 0) latestByBatch.set(record.batchKey, record);
  });

  return Array.from(latestByBatch.values()).map((record) => {
    const rounds = getMarkdownRoundsForBatch(record.batchKey);
    const schedule = evaluateMarkdownSchedule({
      expiryDate: record.expiryDate,
      reference,
      policy: getMarkdownPolicy(locationId),
      rounds,
    });
    return {
      monitorId: `monitor_${record.batchKey}`,
      batchKey: record.batchKey,
      itemId: record.itemId,
      itemName: record.itemName,
      sku: record.sku,
      barcode: record.barcode,
      batchLot: record.batchLot,
      expiryDate: record.expiryDate,
      locationId: record.locationId,
      locationName: record.locationName,
      remainingQuantity: record.quantity,
      remainingQuantitySource: "submitted_quantity_pending_reconciliation",
      quantityType: record.quantityType,
      currentMarkdownPercent: record.selectedMarkdownPercent,
      currentMarkdownPrice: record.selectedMarkdownPrice,
      currentStage: record.stage,
      nextStage: schedule.stage,
      recommendedNextPercent: schedule.suggestedPercent,
      nextActionState: schedule.dueState,
      nextActionDate: schedule.stage === MARKDOWN_STAGES.INITIAL ? schedule.initialMarkdownDate : schedule.finalSellableDate,
      finalSellableDate: schedule.finalSellableDate,
      holidayAdjusted: schedule.holidayAdjusted,
      reducedHoursAdjusted: schedule.reducedHoursAdjusted,
      insufficientSessionWindow: schedule.insufficientSessionWindow,
      effectiveEarlySessionTime: schedule.effectiveEarlySessionTime,
      effectiveFinalSessionTime: schedule.effectiveFinalSessionTime,
      saleBlocked: schedule.stage === MARKDOWN_STAGES.EXPIRED,
      lastMarkdownAt: record.printedAt || record.createdAt,
      latestSubmissionId: record.submissionId,
    };
  }).sort((left, right) => String(left.nextActionDate || "9999-12-31").localeCompare(String(right.nextActionDate || "9999-12-31")));
}
