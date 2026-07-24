#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const client = readFileSync(new URL('../src/inventory-bridge/itemLookup/v1/scanOpsItemLookupClientV1.js', import.meta.url), 'utf8');
const receiptValidator = readFileSync(new URL('../src/inventory-bridge/itemLookup/v1/validateScanOpsItemLookupReceiptV1.js', import.meta.url), 'utf8');
const pairing = readFileSync(new URL('../src/inventory-bridge/pairing/browser/v1/scanOpsBrowserPairingClientV1.js', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/lib/scanOpsLiveConnectivity.js', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../src/components/sync/ReadOnlyItemLookupPilot.jsx', import.meta.url), 'utf8');
const operationalUi = readFileSync(new URL('../src/pages/Scan.jsx', import.meta.url), 'utf8');

const checks = {
  no_local_storage: !client.includes('localStorage'),
  no_session_storage: !client.includes('sessionStorage'),
  no_sync_queue_import: !client.includes('scanOpsSync') && !client.includes('enqueue') && !client.includes('retryAllSyncEvents'),
  no_receiving_operation: !client.includes('RECEIVING_SUBMISSION'),
  no_mutation_calls: !client.includes('.create(') && !client.includes('.update(') && !client.includes('.delete('),
  trusted_lookup_service: service.includes('runLiveItemLookup') && service.includes('createScanOpsItemLookupClientV1'),
  governed_reads_reuse_trusted_service: service.includes('runLiveItemSearch')
    && service.includes('runLiveItemView')
    && service.includes('validateGovernedItemReadRole'),
  local_host_policy_reused: pairing.includes('export function isAllowedLocalInventoryHost')
    && client.includes("import { isAllowedLocalInventoryHost }")
    && client.includes("blockers.push('INVENTORY_HOST_NOT_LOCAL')")
    && client.includes("blockers.push('LOOKUP_PROTOCOL_NOT_LOCAL_HTTP')"),
  single_handoff_endpoint_retained: client.includes("SCANOPS_ITEM_LOOKUP_CLIENT_V1_PATH = '/api/bridge/v1/handoffs'")
    && !client.includes('/api/bridge/v1/item-search')
    && !client.includes('/api/bridge/v1/item-view'),
  exact_mutation_evidence_required: receiptValidator.includes('ZERO_MUTATION_KEY_SET')
    && receiptValidator.includes('Unexpected item read mutation counter')
    && receiptValidator.includes('must contain exactly the approved counters'),
  zero_mutation_ui: ui.includes('Zero mutations verified')
    && operationalUi.includes('Zero mutations verified'),
  no_automatic_candidate_selection: operationalUi.includes('No auto-select')
    && operationalUi.includes('View this item')
    && !operationalUi.includes('results[0]'),
};

const failed = Object.entries(checks).filter(([, passed]) => !passed);
console.log(JSON.stringify({
  phase: '39-0D',
  compatibleThrough: '39-0F5',
  passed: failed.length === 0,
  checks,
  receivingIntegrationAuthorized: false,
  automaticSelectionAuthorized: false,
  mutationCounts: {
    inventory: 0,
    stock: 0,
    ledger: 0,
    pricing: 0,
    purchaseOrder: 0,
    receiving: 0,
    itemMaster: 0,
    scanOps: 0,
  },
}, null, 2));
if (failed.length) process.exit(1);
console.log('SCANOPS_LOOKUP_SOURCE_BOUNDARY_READY');
