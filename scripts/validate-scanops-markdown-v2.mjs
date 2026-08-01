import assert from "node:assert/strict";
import {
  buildMarkdownBatchKey,
  evaluateMarkdownSchedule,
  getEffectiveMarkdownSessionTimes,
  getFinalSellableTradingDate,
  getInitialMarkdownTradingDate,
  getUpcomingClosureWarnings,
  isExpiredForSale,
  MARKDOWN_STAGES,
  validateMarkdownInput,
} from "../src/lib/scanOpsMarkdownPolicy.js";
import {
  MARKDOWN_SALE_DECISIONS,
  validateMarkdownLabelForSale,
} from "../src/lib/scanOpsMarkdownSaleValidation.js";

const normalPolicy = {
  weeklyTradingDays: [0, 1, 2, 3, 4, 5, 6],
  initialLeadTradingDays: 1,
  initialPercent: 25,
  furtherPercent: 50,
  finalPercent: 60,
  earlySessionTime: "09:00",
  finalSessionTime: "15:00",
  minimumMinutesBeforeClose: 90,
  minimumMinutesBetweenSessions: 120,
  advanceWarningTradingDays: 2,
};

assert.equal(getInitialMarkdownTradingDate("2026-08-02", normalPolicy), "2026-08-01", "D-1 must use the previous open trading day");

const goodFridayPolicy = {
  ...normalPolicy,
  dateOverrides: [
    { date: "2027-03-26", isOpen: false, reason: "Good Friday" },
  ],
};
assert.equal(getInitialMarkdownTradingDate("2027-03-27", goodFridayPolicy), "2027-03-25", "A closed Good Friday must be skipped for a Saturday expiry");

const christmasPolicy = {
  ...normalPolicy,
  dateOverrides: [
    { date: "2026-12-25", isOpen: false, reason: "Christmas Day" },
  ],
};
assert.equal(getFinalSellableTradingDate("2026-12-25", christmasPolicy), "2026-12-24", "A batch expiring on Christmas Day must finish selling on Christmas Eve");
assert.equal(getInitialMarkdownTradingDate("2026-12-25", christmasPolicy), "2026-12-23", "The initial markdown must be brought forward one open trading day");

const christmasMorning = evaluateMarkdownSchedule({
  expiryDate: "2026-12-25",
  reference: new Date("2026-12-24T10:00:00"),
  policy: christmasPolicy,
  rounds: [{ stage: MARKDOWN_STAGES.INITIAL, createdAt: "2026-12-23T09:00:00" }],
});
assert.equal(christmasMorning.stage, MARKDOWN_STAGES.FURTHER);
assert.equal(christmasMorning.suggestedPercent, 50);
assert.equal(christmasMorning.holidayAdjusted, true);

const missedInitialBeforeSession = evaluateMarkdownSchedule({
  expiryDate: "2026-08-02",
  reference: new Date("2026-08-02T08:00:00"),
  policy: normalPolicy,
  rounds: [],
});
assert.equal(missedInitialBeforeSession.stage, MARKDOWN_STAGES.FURTHER, "The final sellable day must progress to the 50% round even when the D-1 round was missed");
assert.equal(missedInitialBeforeSession.dueState, "UPCOMING_TODAY");

const christmasAfternoon = evaluateMarkdownSchedule({
  expiryDate: "2026-12-25",
  reference: new Date("2026-12-24T16:00:00"),
  policy: christmasPolicy,
  rounds: [
    { stage: MARKDOWN_STAGES.INITIAL, createdAt: "2026-12-23T09:00:00" },
    { stage: MARKDOWN_STAGES.FURTHER, createdAt: "2026-12-24T10:00:00" },
  ],
});
assert.equal(christmasAfternoon.stage, MARKDOWN_STAGES.FINAL);
assert.equal(christmasAfternoon.suggestedPercent, 60);

const reducedHoursPolicy = {
  ...normalPolicy,
  dateOverrides: [
    { date: "2026-12-24", isOpen: true, opensAt: "08:00", closesAt: "14:00", reason: "Christmas Eve reduced hours" },
  ],
};
const reducedSessions = getEffectiveMarkdownSessionTimes("2026-12-24", reducedHoursPolicy);
assert.equal(reducedSessions.finalSessionTime, "12:30", "Final clearance must move ahead of an early closing time");
assert.equal(reducedSessions.reducedHours, true);

const closureWarnings = getUpcomingClosureWarnings(new Date("2026-12-23T10:00:00"), christmasPolicy);
assert.equal(closureWarnings.length, 1, "Christmas closure must surface within the two-open-day warning window");
assert.equal(closureWarnings[0].date, "2026-12-25");

assert.equal(isExpiredForSale("2026-08-01", new Date("2026-08-02T00:01:00")), true, "The day after expiry must hard-block sale");
assert.equal(isExpiredForSale("2026-08-01", new Date("2026-08-01T23:59:00")), false, "The printed expiry day remains sellable");

const batchOne = buildMarkdownBatchKey({ itemId: "item_1", locationId: "store_1", batchLot: "LOT-A", expiryDate: "2026-08-02" });
const batchTwo = buildMarkdownBatchKey({ itemId: "item_1", locationId: "store_1", batchLot: "LOT-B", expiryDate: "2026-08-03" });
assert.notEqual(batchOne, batchTwo, "Different batches and expiry dates must remain independent");

assert.equal(validateMarkdownInput({ quantity: "1.25", percent: "25", expiryDate: "2026-08-02", batchLot: "LOT-A" }).valid, true, "Weighted quantities must be supported");
assert.equal(validateMarkdownInput({ quantity: "1", percent: "100", expiryDate: "2026-08-02", batchLot: "LOT-A" }).valid, false, "Percentages above 99 must be rejected");
assert.equal(validateMarkdownInput({ quantity: "1", percent: "25", expiryDate: "2026-08-02", batchLot: "" }).valid, false, "Batch / lot is required for accurate lifecycle tracking");

const validRecord = {
  submissionId: "md_sub_1",
  itemId: "item_1",
  sku: "SKU-1",
  barcode: "930000000009",
  batchLot: "LOT-A",
  locationId: "store_1",
  expiryDate: "2026-08-02",
  selectedMarkdownPrice: 10.5,
  printStatus: "PRINTED",
};
const allowedSale = validateMarkdownLabelForSale({
  markdownRecord: validRecord,
  scannedBarcode: "930000000009",
  scannedBatchLot: "LOT-A",
  locationId: "store_1",
  activeSubmissionId: "md_sub_1",
  businessDate: new Date("2026-08-02T12:00:00"),
});
assert.equal(allowedSale.allowed, true, "An active label remains sellable through its printed expiry day");

const expiredSale = validateMarkdownLabelForSale({
  markdownRecord: validRecord,
  scannedBarcode: "930000000009",
  scannedBatchLot: "LOT-A",
  locationId: "store_1",
  activeSubmissionId: "md_sub_1",
  businessDate: new Date("2026-08-03T00:01:00"),
});
assert.equal(expiredSale.decision, MARKDOWN_SALE_DECISIONS.BLOCK_EXPIRED, "POS contract must hard-block a past-expiry batch");

const supersededSale = validateMarkdownLabelForSale({
  markdownRecord: { ...validRecord, printStatus: "SUPERSEDED", supersededBy: "md_sub_2" },
  scannedBarcode: "930000000009",
  scannedBatchLot: "LOT-A",
  locationId: "store_1",
  activeSubmissionId: "md_sub_2",
  businessDate: new Date("2026-08-02T12:00:00"),
});
assert.equal(supersededSale.decision, MARKDOWN_SALE_DECISIONS.BLOCK_SUPERSEDED, "An older markdown round must not remain active after a deeper round prints");

const wrongItemSale = validateMarkdownLabelForSale({
  markdownRecord: validRecord,
  scannedBarcode: "930000000010",
  scannedBatchLot: "LOT-A",
  locationId: "store_1",
  businessDate: new Date("2026-08-02T12:00:00"),
});
assert.equal(wrongItemSale.decision, MARKDOWN_SALE_DECISIONS.BLOCK_ITEM_MISMATCH);

console.log("ScanOps Markdown V2 validation passed");
