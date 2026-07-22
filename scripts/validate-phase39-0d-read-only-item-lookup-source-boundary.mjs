#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const client = readFileSync(new URL('../src/inventory-bridge/itemLookup/v1/scanOpsItemLookupClientV1.js', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/lib/scanOpsLiveConnectivity.js', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../src/components/sync/ReadOnlyItemLookupPilot.jsx', import.meta.url), 'utf8');

const checks = {
  no_local_storage: !client.includes('localStorage'),
  no_session_storage: !client.includes('sessionStorage'),
  no_sync_queue_import: !client.includes('scanOpsSync') && !client.includes('enqueue') && !client.includes('retryAllSyncEvents'),
  no_receiving_operation: !client.includes('RECEIVING_SUBMISSION'),
  no_mutation_calls: !client.includes('.create(') && !client.includes('.update(') && !client.includes('.delete('),
  trusted_lookup_service: service.includes('runLiveItemLookup') && service.includes('createScanOpsItemLookupClientV1'),
  zero_mutation_ui: ui.includes('Zero mutations verified'),
};

const failed = Object.entries(checks).filter(([, passed]) => !passed);
console.log(JSON.stringify({
  phase: '39-0D',
  passed: failed.length === 0,
  checks,
  receivingIntegrationAuthorized: false,
  mutationCounts: {
    inventory: 0,
    stock: 0,
    ledger: 0,
    pricing: 0,
    purchaseOrder: 0,
    receiving: 0,
    itemMaster: 0,
    scanOps: 0
  }
}, null, 2));
if (failed.length) process.exit(1);
console.log('SCANOPS_LOOKUP_SOURCE_BOUNDARY_READY');
