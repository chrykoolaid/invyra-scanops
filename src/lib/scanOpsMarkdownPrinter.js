import { base44 } from "../api/base44Client";

export const MARKDOWN_PRINT_VERSION = "SCANOPS_MARKDOWN_PRINT_V2";

function escapeZpl(value) {
  return String(value ?? "").replace(/[\^~]/g, " ").slice(0, 80);
}

function money(currency, value) {
  return `${currency || "₱"}${Number(value || 0).toFixed(2)}`;
}

export function buildMarkdownLabelPayload(record) {
  const expiry = record.expiryDate || "—";
  const batch = record.batchLot || "—";
  const itemCode = record.barcode || record.sku || record.itemId || record.submissionId;
  return {
    version: MARKDOWN_PRINT_VERSION,
    submissionId: record.submissionId,
    markdownRecordId: record.submissionId,
    itemId: record.itemId || null,
    itemName: record.itemName,
    sku: record.sku || null,
    barcode: record.barcode || null,
    itemCode,
    batchLot: batch,
    expiryDate: expiry,
    markdownStage: record.stage,
    markdownPercent: record.selectedMarkdownPercent,
    markdownPrice: record.selectedMarkdownPrice,
    currentPrice: record.currentPrice,
    currency: record.currency || "₱",
    locationId: record.locationId || null,
    quantity: record.quantity,
    quantityType: record.quantityType || "each",
    copies: record.labelCopies || 1,
    createdAt: record.createdAt,
  };
}

export function buildZplMarkdownLabel(payload, printer = {}) {
  const widthDots = Math.max(320, Math.round(Number(printer.labelWidth || 50) * 8));
  const heightDots = Math.max(240, Math.round(Number(printer.labelHeight || 30) * 8));
  return [
    "^XA",
    `^PW${widthDots}`,
    `^LL${heightDots}`,
    "^CF0,26",
    `^FO20,18^FD${escapeZpl(payload.itemName)}^FS`,
    "^CF0,20",
    `^FO20,54^FD${escapeZpl(`${payload.markdownPercent}% OFF · ${money(payload.currency, payload.markdownPrice)}`)}^FS`,
    `^FO20,84^FDBatch: ${escapeZpl(payload.batchLot)}^FS`,
    `^FO20,112^FDExpiry: ${escapeZpl(payload.expiryDate)}^FS`,
    `^FO20,140^FDStage: ${escapeZpl(payload.markdownStage)}^FS`,
    `^FO20,170^BY2^BCN,48,Y,N,N^FD${escapeZpl(payload.submissionId)}^FS`,
    "^XZ",
  ].join("\n");
}

export function buildEscPosMarkdownLabel(payload) {
  return [
    payload.itemName,
    `${payload.markdownPercent}% OFF  ${money(payload.currency, payload.markdownPrice)}`,
    `Batch: ${payload.batchLot}`,
    `Expiry: ${payload.expiryDate}`,
    `Stage: ${payload.markdownStage}`,
    `Record: ${payload.submissionId}`,
    "\n\n",
  ].join("\n");
}

export async function getDefaultMarkdownPrinter() {
  try {
    const printers = await base44.entities.PrinterConfig.list();
    const active = (printers || []).filter((printer) => printer?.status !== "inactive");
    return active.find((printer) => printer.isDefault) || active[0] || null;
  } catch (error) {
    return null;
  }
}

function normalizeBridgeResult(result) {
  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return { ok: result.toLowerCase() === "ok", message: result };
    }
  }
  return result || {};
}

async function callNativeBridge({ printer, payload, raw, copies }) {
  if (typeof window === "undefined") return null;

  if (window.scanOpsPrinter?.printLabels) {
    return normalizeBridgeResult(await window.scanOpsPrinter.printLabels({ printer, payload, raw, copies }));
  }

  if (window.ScanOpsPrinter?.printLabels) {
    return normalizeBridgeResult(await window.ScanOpsPrinter.printLabels(JSON.stringify({ printer, payload, raw, copies })));
  }

  if (window.AndroidPrinter?.printLabels) {
    return normalizeBridgeResult(await window.AndroidPrinter.printLabels(JSON.stringify({ printer, payload, raw, copies })));
  }

  return null;
}

export async function printMarkdownLabels(record, printerInput = null) {
  const printer = printerInput || await getDefaultMarkdownPrinter();
  if (!printer) {
    return {
      ok: false,
      code: "PRINTER_NOT_CONFIGURED",
      message: "No active label printer is configured. Add a default printer in Printer Settings, then retry printing.",
    };
  }

  const payload = buildMarkdownLabelPayload(record);
  const format = String(printer.labelFormat || "ZPL").toUpperCase();
  const raw = format === "ESC/POS" ? buildEscPosMarkdownLabel(payload) : buildZplMarkdownLabel(payload, printer);
  const copies = Math.max(1, Number(record.labelCopies || payload.copies || 1));

  try {
    const result = await callNativeBridge({ printer, payload, raw, copies });
    if (!result) {
      return {
        ok: false,
        code: "PRINTER_BRIDGE_UNAVAILABLE",
        message: "The printer is configured, but this browser is not connected to the ScanOps printer bridge. Keep this markdown open and retry on the paired handheld.",
        printer,
      };
    }
    if (result.ok === false) {
      return {
        ok: false,
        code: result.code || "PRINT_FAILED",
        message: result.message || "The label printer did not confirm printing.",
        printer,
      };
    }
    return {
      ok: true,
      code: "PRINTED",
      message: result.message || `${copies} label${copies === 1 ? "" : "s"} printed`,
      printer,
      copies,
      nativeJobId: result.jobId || result.nativeJobId || null,
    };
  } catch (error) {
    return {
      ok: false,
      code: "PRINT_FAILED",
      message: error?.message || "Labels could not be printed.",
      printer,
    };
  }
}
