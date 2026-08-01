export const MARKDOWN_POLICY_VERSION = "SCANOPS_MARKDOWN_POLICY_V2";

export const MARKDOWN_STAGES = {
  INITIAL: "INITIAL",
  FURTHER: "FURTHER",
  FINAL: "FINAL",
  EXPIRED: "EXPIRED",
};

export const DEFAULT_MARKDOWN_POLICY = Object.freeze({
  initialLeadTradingDays: 1,
  initialPercent: 25,
  furtherPercent: 50,
  finalPercent: 60,
  earlySessionTime: "09:00",
  finalSessionTime: "15:00",
  advanceWarningTradingDays: 2,
  weeklyTradingDays: [0, 1, 2, 3, 4, 5, 6],
  dateOverrides: [],
});

function pad(value) {
  return String(value).padStart(2, "0");
}

export function toDateOnly(value = new Date()) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateAtNoon(dateOnly) {
  return new Date(`${dateOnly}T12:00:00`);
}

export function addCalendarDays(dateOnly, amount) {
  const date = dateAtNoon(dateOnly);
  date.setDate(date.getDate() + Number(amount || 0));
  return toDateOnly(date);
}

export function compareDateOnly(left, right) {
  if (!left || !right) return 0;
  return String(left).localeCompare(String(right));
}

export function normalizeMarkdownPolicy(input = {}) {
  const weeklyTradingDays = Array.isArray(input.weeklyTradingDays)
    ? input.weeklyTradingDays.map(Number).filter((day) => day >= 0 && day <= 6)
    : DEFAULT_MARKDOWN_POLICY.weeklyTradingDays;
  const dateOverrides = Array.isArray(input.dateOverrides) ? input.dateOverrides : [];
  return {
    ...DEFAULT_MARKDOWN_POLICY,
    ...input,
    initialLeadTradingDays: Math.max(1, Number(input.initialLeadTradingDays || DEFAULT_MARKDOWN_POLICY.initialLeadTradingDays)),
    initialPercent: Math.min(99, Math.max(1, Number(input.initialPercent || DEFAULT_MARKDOWN_POLICY.initialPercent))),
    furtherPercent: Math.min(99, Math.max(1, Number(input.furtherPercent || DEFAULT_MARKDOWN_POLICY.furtherPercent))),
    finalPercent: Math.min(99, Math.max(1, Number(input.finalPercent || DEFAULT_MARKDOWN_POLICY.finalPercent))),
    weeklyTradingDays,
    dateOverrides,
  };
}

export function getTradingDateOverride(dateOnly, policyInput = {}) {
  const policy = normalizeMarkdownPolicy(policyInput);
  return policy.dateOverrides.find((entry) => entry?.date === dateOnly) || null;
}

export function isTradingDate(dateOnly, policyInput = {}) {
  const policy = normalizeMarkdownPolicy(policyInput);
  const override = getTradingDateOverride(dateOnly, policy);
  if (override) return override.isOpen !== false;
  const date = dateAtNoon(dateOnly);
  if (Number.isNaN(date.getTime())) return false;
  return policy.weeklyTradingDays.includes(date.getDay());
}

export function getTradingHours(dateOnly, policyInput = {}) {
  const policy = normalizeMarkdownPolicy(policyInput);
  const override = getTradingDateOverride(dateOnly, policy);
  if (override?.isOpen === false) return null;
  return {
    opensAt: override?.opensAt || "00:00",
    closesAt: override?.closesAt || "23:59",
    reducedHours: Boolean(override?.opensAt || override?.closesAt),
    reason: override?.reason || null,
  };
}

export function getPreviousTradingDate(dateOnly, policyInput = {}, count = 1) {
  const policy = normalizeMarkdownPolicy(policyInput);
  let cursor = dateOnly;
  let remaining = Math.max(1, Number(count || 1));
  let guard = 0;
  while (remaining > 0 && guard < 370) {
    cursor = addCalendarDays(cursor, -1);
    if (isTradingDate(cursor, policy)) remaining -= 1;
    guard += 1;
  }
  return cursor;
}

export function getFinalSellableTradingDate(expiryDate, policyInput = {}) {
  const dateOnly = toDateOnly(expiryDate);
  if (!dateOnly) return null;
  if (isTradingDate(dateOnly, policyInput)) return dateOnly;
  return getPreviousTradingDate(dateOnly, policyInput, 1);
}

export function getInitialMarkdownTradingDate(expiryDate, policyInput = {}) {
  const policy = normalizeMarkdownPolicy(policyInput);
  const finalSellableDate = getFinalSellableTradingDate(expiryDate, policy);
  if (!finalSellableDate) return null;
  return getPreviousTradingDate(finalSellableDate, policy, policy.initialLeadTradingDays);
}

export function isExpiredForSale(expiryDate, reference = new Date()) {
  const expiry = toDateOnly(expiryDate);
  const today = toDateOnly(reference);
  if (!expiry || !today) return false;
  return compareDateOnly(today, expiry) > 0;
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function currentMinutes(reference = new Date()) {
  const date = reference instanceof Date ? reference : new Date(reference);
  return date.getHours() * 60 + date.getMinutes();
}

function latestStage(rounds = []) {
  const order = {
    [MARKDOWN_STAGES.INITIAL]: 1,
    [MARKDOWN_STAGES.FURTHER]: 2,
    [MARKDOWN_STAGES.FINAL]: 3,
  };
  return rounds
    .filter((round) => round && order[round.stage])
    .sort((left, right) => (order[right.stage] - order[left.stage]) || String(right.createdAt || "").localeCompare(String(left.createdAt || "")))[0]?.stage || null;
}

export function evaluateMarkdownSchedule({ expiryDate, reference = new Date(), policy: policyInput = {}, rounds = [] } = {}) {
  const policy = normalizeMarkdownPolicy(policyInput);
  const expiry = toDateOnly(expiryDate);
  const today = toDateOnly(reference);
  const finalSellableDate = getFinalSellableTradingDate(expiry, policy);
  const initialMarkdownDate = getInitialMarkdownTradingDate(expiry, policy);
  const holidayAdjusted = Boolean(expiry && finalSellableDate && expiry !== finalSellableDate);
  const previousStage = latestStage(rounds);

  if (!expiry) {
    return {
      policyVersion: MARKDOWN_POLICY_VERSION,
      stage: MARKDOWN_STAGES.INITIAL,
      suggestedPercent: policy.initialPercent,
      dueState: "EXPIRY_REQUIRED",
      expiryDate: null,
      finalSellableDate: null,
      initialMarkdownDate: null,
      holidayAdjusted: false,
      previousStage,
      helper: "Enter the batch expiry date to calculate the markdown round.",
    };
  }

  if (isExpiredForSale(expiry, reference)) {
    return {
      policyVersion: MARKDOWN_POLICY_VERSION,
      stage: MARKDOWN_STAGES.EXPIRED,
      suggestedPercent: 0,
      dueState: "SALE_BLOCKED",
      expiryDate: expiry,
      finalSellableDate,
      initialMarkdownDate,
      holidayAdjusted,
      previousStage,
      helper: `Expired ${expiry}. This batch cannot be sold and must move to waste review.`,
    };
  }

  const onFinalSellableDate = today === finalSellableDate;
  const afterInitialDate = compareDateOnly(today, initialMarkdownDate) >= 0;
  const nowMinutes = currentMinutes(reference);
  const finalSessionMinutes = minutesFromTime(policy.finalSessionTime);
  const earlySessionMinutes = minutesFromTime(policy.earlySessionTime);

  let stage = MARKDOWN_STAGES.INITIAL;
  let dueState = afterInitialDate ? "DUE" : "UPCOMING";

  if (previousStage === MARKDOWN_STAGES.FINAL) {
    stage = MARKDOWN_STAGES.FINAL;
    dueState = "COMPLETE";
  } else if (onFinalSellableDate) {
    if (nowMinutes >= finalSessionMinutes || previousStage === MARKDOWN_STAGES.FURTHER) {
      stage = MARKDOWN_STAGES.FINAL;
      dueState = nowMinutes >= finalSessionMinutes ? "DUE" : "UPCOMING_LATER_TODAY";
    } else if (nowMinutes >= earlySessionMinutes || previousStage === MARKDOWN_STAGES.INITIAL || !previousStage) {
      stage = MARKDOWN_STAGES.FURTHER;
      dueState = "DUE";
    }
  } else if (previousStage === MARKDOWN_STAGES.INITIAL) {
    stage = MARKDOWN_STAGES.FURTHER;
    dueState = "UPCOMING";
  }

  const suggestedPercent = stage === MARKDOWN_STAGES.FINAL
    ? policy.finalPercent
    : stage === MARKDOWN_STAGES.FURTHER
      ? policy.furtherPercent
      : policy.initialPercent;

  const stageLabel = stage === MARKDOWN_STAGES.FINAL
    ? "Final clearance"
    : stage === MARKDOWN_STAGES.FURTHER
      ? "Further markdown"
      : "Initial markdown";
  const dateHelper = holidayAdjusted
    ? `Expiry ${expiry} · final sellable trading day ${finalSellableDate}`
    : stage === MARKDOWN_STAGES.INITIAL
      ? `D-1 trading day · expiry ${expiry}`
      : `Final sellable day · expiry ${expiry}`;

  return {
    policyVersion: MARKDOWN_POLICY_VERSION,
    stage,
    stageLabel,
    suggestedPercent,
    dueState,
    expiryDate: expiry,
    finalSellableDate,
    initialMarkdownDate,
    holidayAdjusted,
    previousStage,
    helper: `${stageLabel} · ${dateHelper}`,
  };
}

export function buildMarkdownBatchKey({ itemId, sku, barcode, locationId, batchLot, expiryDate } = {}) {
  return [
    itemId || sku || barcode || "unknown-item",
    locationId || "unknown-location",
    String(batchLot || "").trim().toLowerCase(),
    toDateOnly(expiryDate) || "unknown-expiry",
  ].join("|");
}

export function validateMarkdownInput({ quantity, percent, expiryDate, batchLot } = {}) {
  const errors = [];
  const parsedQuantity = Number(quantity);
  const parsedPercent = Number(percent);
  if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) errors.push({ code: "QUANTITY_INVALID", field: "quantity", message: "Enter a quantity greater than zero." });
  if (!Number.isInteger(parsedPercent) || parsedPercent < 1 || parsedPercent > 99) errors.push({ code: "PERCENT_INVALID", field: "percent", message: "Enter a whole markdown percentage from 1 to 99." });
  if (!toDateOnly(expiryDate)) errors.push({ code: "EXPIRY_REQUIRED", field: "expiryDate", message: "Enter the batch expiry date." });
  if (!String(batchLot || "").trim()) errors.push({ code: "BATCH_REQUIRED", field: "batchLot", message: "Enter or scan the batch / lot so the markdown can be tracked accurately." });
  return { valid: errors.length === 0, errors };
}
