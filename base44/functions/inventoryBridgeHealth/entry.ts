/**
 * inventoryBridgeHealth — Phase 1D-B
 *
 * ⚠️  PROTOTYPE CLOUD RELAY — NOT A LOCAL LAN BRIDGE
 *
 * This function is a Base44 cloud-hosted prototype relay.
 * It is NOT a local LAN server.
 * It is NOT a store Wi-Fi/IP bridge host.
 * It is NOT offline-capable.
 * The real production bridge requires a desktop/local server companion service.
 *
 * Purpose:
 *   Return prototype bridge health and capabilities metadata so that ScanOps
 *   devices can verify the bridge is reachable and check supported features
 *   before submitting events.
 *
 * HARD RULES:
 *   - No stock mutation.
 *   - No price mutation.
 *   - No POS/order/forecast/Item Master mutation.
 *   - No StockMovement or POSLineItem creation.
 *   - No MarkdownRound or price activation.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

// ── Constants (inlined — no local imports in Deno functions) ──────────────────

const BRIDGE_PROTOCOL_VERSION = "1.0.0";
const BRIDGE_NAME             = "Invyra Inventory Bridge";
const BRIDGE_VERSION          = "1.0.0";
const TRANSPORT_NOTE          = "PROTOTYPE CLOUD RELAY — NOT A LOCAL LAN BRIDGE";

const BRIDGE_ENVIRONMENTS = { LIVE: "LIVE", TRAINING: "TRAINING", TEST: "TEST" };

// Active capabilities in Phase 1D-B prototype.
// inventory_snapshot_publish and markdown_overlay_publish are NOT yet active.
const ACTIVE_CAPABILITIES = [
  "scanops_markdown_sync",
  "receipt_return",
  "device_pairing",
  "batch_events",
];

const CAPABILITIES_MAP = {
  scanops_markdown_sync:      true,
  receipt_return:             true,
  inventory_snapshot_publish: false,  // Not active in Phase 1D
  markdown_overlay_publish:   false,  // Not active in Phase 1D
  device_pairing:             true,
  batch_events:               true,
};

const SUPPORTED_EVENT_TYPES = [
  "scanops.markdown.requested",
  "scanops.markdown.approved",
  "scanops.markdown.returned",
  "scanops.markdown.rejected",
  "scanops.markdown.handoff.created",
];

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Both GET (health check) and POST (extended health) are accepted.
    // POST allows ScanOps to include { action: "capabilities" } for the full
    // capabilities detail — same function, richer response.
    const isCapabilitiesRequest = req.method === "POST";

    // BRIDGE_ENVIRONMENT is optional — defaults to LIVE if not set.
    // It is NOT a required secret; Deno.env.get returns undefined safely.
    const environment = (typeof Deno !== "undefined" && Deno.env?.get("BRIDGE_ENVIRONMENT")) || BRIDGE_ENVIRONMENTS.LIVE;

    const healthResponse = {
      status:                  "ok",
      bridge_name:             BRIDGE_NAME,
      bridge_version:          BRIDGE_VERSION,
      bridge_protocol_version: BRIDGE_PROTOCOL_VERSION,
      environment,
      current_time:            new Date().toISOString(),
      capabilities:            ACTIVE_CAPABILITIES,
      prototype_transport:     true,
      transport_note:          TRANSPORT_NOTE,
      _prototype_disclosure:   [
        "This endpoint is served by a Base44 cloud-hosted function.",
        "It is NOT a local LAN/Wi-Fi bridge server.",
        "Production LAN bridge requires a desktop companion service (Phase 1D-F).",
        "Transport never bypasses processInboundScanOpsEvent(event).",
        "No stock, price, POS, order, or forecast mutation is performed.",
      ],
    };

    // If the caller requested full capabilities detail, extend the response.
    if (isCapabilitiesRequest) {
      healthResponse.capabilities_detail = {
        bridge_protocol_version: BRIDGE_PROTOCOL_VERSION,
        supported_event_types:   SUPPORTED_EVENT_TYPES,
        capabilities:            CAPABILITIES_MAP,
        max_batch_size:          20,
        phase:                   "1D-B",
        notes: [
          "inventory_snapshot_publish is not yet active.",
          "markdown_overlay_publish is not yet active.",
          "Device pairing token enforcement is planned for Phase 1D-D.",
        ],
      };
    }

    return Response.json(healthResponse, { status: 200 });

  } catch (error) {
    return Response.json({
      status:          "degraded",
      reason:          "INTERNAL_ERROR",
      error:           error.message,
      prototype_transport: true,
      transport_note:  TRANSPORT_NOTE,
    }, { status: 503 });
  }
});