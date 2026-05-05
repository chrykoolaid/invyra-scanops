import { SCANOPS_USER_CONTEXT } from "./scanOpsInventoryFixtures";
import { buildShelfTicketLine, SHELF_TICKET_REASONS, SHELF_TICKET_TYPES, validateShelfTicketBatch } from "./scanOpsShelfTicketRules";

const STORAGE_KEY = "invyra_scanops_shelf_ticket_batch_v1";

function readBatch() {
  if (typeof window === "undefined") return createEmptyShelfTicketBatch();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : createEmptyShelfTicketBatch();
  } catch {
    return createEmptyShelfTicketBatch();
  }
}

function writeBatch(batch) {
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(batch)); } catch {}
  }
  return batch;
}

export function createShelfTicketBatch(extra = {}) {
  return {
    ticketBatchId: extra.ticketBatchId || `STB-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requestedByDevice: SCANOPS_USER_CONTEXT.scanner_id,
    requestedByUser: SCANOPS_USER_CONTEXT.user_id,
    requestedByRole: SCANOPS_USER_CONTEXT.role,
    locationId: SCANOPS_USER_CONTEXT.location_id,
    defaultTicketType: extra.defaultTicketType || SHELF_TICKET_TYPES.STANDARD_SHELF_TICKET,
    defaultTicketReason: extra.defaultTicketReason || SHELF_TICKET_REASONS.MISSING_OR_DAMAGED,
    syncTarget: "DESKTOP_TICKET_QUEUE",
    syncStatus: "DRAFT_ON_SCANNER",
    lines: [],
    ...extra,
  };
}

export function createEmptyShelfTicketBatch() {
  return createShelfTicketBatch();
}

export function getCurrentShelfTicketBatch() {
  return readBatch();
}

export function saveCurrentShelfTicketBatch(batch) {
  return writeBatch({ ...batch, updatedAt: new Date().toISOString() });
}

export function resetShelfTicketBatch(defaultTicketType, defaultTicketReason) {
  return saveCurrentShelfTicketBatch(createShelfTicketBatch({ defaultTicketType, defaultTicketReason }));
}

export function addItemToShelfTicketBatch(batch, item, ticketType, ticketReason) {
  const base = batch || createShelfTicketBatch();
  const line = buildShelfTicketLine(item, ticketType || base.defaultTicketType, ticketReason || base.defaultTicketReason, {
    ticketBatchId: base.ticketBatchId,
    requestedByDevice: SCANOPS_USER_CONTEXT.scanner_id,
  });
  return saveCurrentShelfTicketBatch({
    ...base,
    defaultTicketType: ticketType || base.defaultTicketType,
    defaultTicketReason: ticketReason || base.defaultTicketReason,
    lines: [line, ...(base.lines || [])],
  });
}

export function removeShelfTicketLine(batch, ticketLineId) {
  const base = batch || createShelfTicketBatch();
  return saveCurrentShelfTicketBatch({ ...base, lines: (base.lines || []).filter((line) => line.ticketLineId !== ticketLineId) });
}

export function markShelfTicketBatchSent(batch) {
  const validation = validateShelfTicketBatch(batch);
  if (!validation.ok) return { batch, validation };
  const sentBatch = saveCurrentShelfTicketBatch({
    ...batch,
    syncStatus: "QUEUED_FOR_DESKTOP",
    sentToDesktopAt: new Date().toISOString(),
    lines: (batch.lines || []).map((line) => ({ ...line, syncStatus: "QUEUED_FOR_DESKTOP" })),
  });
  return { batch: sentBatch, validation };
}
