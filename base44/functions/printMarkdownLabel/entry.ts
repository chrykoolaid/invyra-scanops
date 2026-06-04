/**
 * printMarkdownLabel — formats a markdown label and sends raw bytes
 * to a WiFi label printer via TCP on port 9100.
 *
 * Called from the ScanOps Markdowns page after a markdown is approved.
 * Payload: { recordId, printerConfigId? }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Build a ZPL label for a markdown item
function buildZPL({ itemName, originalPrice, markdownPercent, newPrice, sku, barcode, currency = "₱" }) {
  const safeItemName = String(itemName || "Item").replace(/[^a-zA-Z0-9 \-\/\.]/g, "").slice(0, 30);
  const safeSku = String(sku || barcode || "").slice(0, 20);
  return [
    "^XA",
    "^CF0,28",
    `^FO20,15^FD${safeItemName}^FS`,
    "^CF0,22",
    `^FO20,50^FDWAS: ${currency}${Number(originalPrice || 0).toFixed(2)}^FS`,
    "^CF0,40",
    `^FO20,80^FDNOW: ${currency}${Number(newPrice || 0).toFixed(2)}^FS`,
    "^CF0,20",
    `^FO20,130^FD${markdownPercent}% OFF^FS`,
    safeSku ? `^FO20,155^FD${safeSku}^FS` : "",
    "^XZ",
  ].filter(Boolean).join("\n");
}

// Build an ESC/POS label for a markdown item
function buildESCPOS({ itemName, originalPrice, markdownPercent, newPrice, sku, barcode, currency = "₱" }) {
  const ESC = "\x1b";
  const GS = "\x1d";
  const lines = [
    `${ESC}@`,                          // Init
    `${ESC}a\x01`,                       // Center align
    `${ESC}!\x30`,                       // Double height + bold
    `${String(itemName || "Item").slice(0, 24)}\n`,
    `${ESC}!\x00`,                       // Normal
    `WAS: ${currency}${Number(originalPrice || 0).toFixed(2)}\n`,
    `${ESC}!\x38`,                       // Bold + large
    `NOW: ${currency}${Number(newPrice || 0).toFixed(2)}\n`,
    `${ESC}!\x00`,
    `${markdownPercent}% OFF\n`,
    sku ? `${sku}\n` : "",
    "\n\n",
    `${GS}V\x41\x03`,                   // Cut
  ].filter(Boolean).join("");
  return lines;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { recordId, printerConfigId } = await req.json();
    if (!recordId) return Response.json({ error: "recordId is required" }, { status: 400 });

    // Fetch the markdown record
    const records = await base44.asServiceRole.entities.ScanOpsRecord.filter({ id: recordId });
    const record = records?.[0];
    if (!record) return Response.json({ error: "Record not found" }, { status: 404 });

    // Fetch printer config — use specified or find default
    let printer = null;
    if (printerConfigId) {
      const printers = await base44.asServiceRole.entities.PrinterConfig.filter({ id: printerConfigId });
      printer = printers?.[0];
    } else {
      const printers = await base44.asServiceRole.entities.PrinterConfig.filter({ isDefault: true, status: "active" });
      printer = printers?.[0];
      if (!printer) {
        const all = await base44.asServiceRole.entities.PrinterConfig.filter({ status: "active" });
        printer = all?.[0];
      }
    }

    if (!printer) return Response.json({ error: "No printer configured. Please add a printer in Printer Settings." }, { status: 400 });

    // Build label data
    const payload = record.payload || {};
    const originalPrice = payload.originalPrice ?? record.quantity ?? 0;
    const markdownPercent = payload.markdownPercent ?? 10;
    const newPrice = payload.newPrice ?? (originalPrice * (1 - markdownPercent / 100));
    const labelData = {
      itemName: record.itemName,
      originalPrice,
      markdownPercent,
      newPrice,
      sku: record.itemSku,
      barcode: record.itemBarcode,
      currency: payload.currency || "₱",
    };

    const rawLabel = printer.labelFormat === "ESC/POS"
      ? buildESCPOS(labelData)
      : buildZPL(labelData);

    // Send raw bytes to printer over TCP
    const host = printer.ipAddress.trim();
    const port = Number(printer.port || 9100);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(rawLabel);

    const conn = await Deno.connect({ hostname: host, port });
    await conn.write(bytes);
    conn.close();

    // Mark the record as label_printed
    await base44.asServiceRole.entities.ScanOpsRecord.update(recordId, {
      outcomeLabel: "label_printed",
      status: record.status,
    });

    return Response.json({
      success: true,
      printer: printer.name,
      format: printer.labelFormat,
      itemName: record.itemName,
    });
  } catch (error) {
    // Distinguish connection errors from other errors
    const isConnError = error.message?.includes("connect") || error.message?.includes("ECONNREFUSED") || error.message?.includes("timed out");
    return Response.json({
      error: isConnError
        ? `Could not reach printer. Check the IP address and that the printer is on the same WiFi network.`
        : error.message,
    }, { status: 500 });
  }
});