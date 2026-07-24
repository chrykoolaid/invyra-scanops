#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { BRIDGE_CONTRACT_V1 } from '../src/inventory-bridge/canonicalContract/v1/index.js';
import {
  ITEM_SEARCH_OPERATION,
  ITEM_VIEW_OPERATION,
  createScanOpsItemLookupClientV1,
} from '../src/inventory-bridge/itemLookup/v1/index.js';

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}

const ZERO_MUTATIONS = Object.freeze({
  inventory: 0,
  stock: 0,
  ledger: 0,
  item_master: 0,
  pricing: 0,
  purchase_order: 0,
  receiving: 0,
});

function receiptBase(envelope) {
  const timestamp = new Date().toISOString();
  return {
    contractId: BRIDGE_CONTRACT_V1.contractId,
    schemaVersion: BRIDGE_CONTRACT_V1.schemaVersion,
    receiptId: `receipt:lookup:${envelope.envelopeId}`,
    envelopeId: envelope.envelopeId,
    idempotencyKey: envelope.idempotencyKey,
    traceId: envelope.traceId,
    receivedAt: timestamp,
    processedAt: timestamp,
    inventoryInstanceId: envelope.target.inventoryInstanceId,
    environment: envelope.environment,
    operationType: 'LOOKUP_REQUEST',
    applicationStatus: 'NOT_APPLICABLE',
    warnings: [],
  };
}

function searchResult(envelope, overrides = {}) {
  const request = envelope.payload.payload;
  const noResults = request.query === 'missing item';
  return {
    operation: ITEM_SEARCH_OPERATION,
    found: !noResults,
    code: 'ITEM_SEARCH_READY',
    searchType: 'NAME',
    query: request.query,
    normalizedQuery: request.query.toLowerCase(),
    catalogueEnvironment: 'LIVE',
    matchCount: noResults ? 0 : 2,
    matchCountComplete: true,
    resultLimit: request.limit,
    page: request.page,
    totalPages: noResults ? 1 : 2,
    hasPrevious: request.page > 1,
    hasNext: !noResults && request.page < 2,
    autoSelected: false,
    results: noResults ? [] : [
      {
        canonicalItemId: 'item-search-001',
        itemName: 'Laundry Detergent 2L',
        sku: 'DET-2L',
        brand: 'Invyra Home',
        packSize: '2L',
        unitOfMeasure: 'each',
        primaryBarcode: '9300000000501',
        lifecycleStatus: 'ACTIVE',
        batchTracked: false,
        expiryTracked: false,
        searchRank: 1,
      },
      {
        canonicalItemId: 'item-search-002',
        itemName: 'Laundry Detergent 1L Legacy',
        sku: 'DET-1L-OLD',
        brand: 'Invyra Home',
        packSize: '1L',
        unitOfMeasure: 'each',
        primaryBarcode: '9300000000502',
        lifecycleStatus: 'INACTIVE',
        batchTracked: false,
        expiryTracked: false,
        searchRank: 2,
      },
    ],
    platformSafeguardReached: false,
    mutationCounts: ZERO_MUTATIONS,
    ...overrides,
  };
}

function viewResult(envelope, overrides = {}) {
  const canonicalItemId = envelope.payload.payload.canonical_item_id;
  const found = canonicalItemId !== 'item-missing';
  return {
    operation: ITEM_VIEW_OPERATION,
    found,
    code: found ? 'ITEM_VIEW_READY' : 'ITEM_NOT_FOUND',
    canonicalItemId,
    catalogueEnvironment: 'LIVE',
    item: found ? {
      canonicalItemId,
      sku: 'DET-2L',
      itemName: 'Laundry Detergent 2L',
      shortDisplayName: 'Detergent 2L',
      brand: 'Invyra Home',
      category: 'Laundry',
      unitOfMeasure: 'each',
      packSize: '2L',
      primaryBarcode: '9300000000501',
      alternateBarcodes: ['9300000000599'],
      lifecycleStatus: 'ACTIVE',
      isActive: true,
      batchTracked: false,
      expiryTracked: false,
      serialised: false,
      storageGuidance: 'Store upright in a cool dry place.',
      minimumShelfLifeDays: null,
      updatedDate: '2026-07-24T00:00:00.000Z',
    } : null,
    mutationCounts: ZERO_MUTATIONS,
    ...overrides,
  };
}

function exactResult(envelope) {
  return {
    found: true,
    code: 'ITEM_FOUND',
    lookupType: envelope.payload.lookupType,
    lookupValue: envelope.payload.lookupValue,
    item: {
      canonicalItemId: 'item-exact-001',
      sku: envelope.payload.lookupValue,
      itemName: 'Exact Lookup Item',
      primaryBarcode: '9300000000590',
      lifecycleStatus: 'ACTIVE',
      batchTracked: false,
      expiryTracked: false,
    },
    mutationCounts: ZERO_MUTATIONS,
  };
}

function responseFor(envelope) {
  const base = receiptBase(envelope);
  const operation = envelope.payload.operation;

  if (operation === ITEM_SEARCH_OPERATION && envelope.payload.payload.query === 'auth unavailable') {
    return new Response(JSON.stringify({
      ...base,
      admissionStatus: 'SERVICE_UNAVAILABLE',
      message: 'Inventory read authorisation is unavailable or expired.',
      errors: [{
        code: 'SERVICE_UNAVAILABLE',
        message: 'Inventory read authorisation is unavailable or expired.',
        field: 'itemReadAdapter',
        retryable: true,
      }],
      result: {
        operation: ITEM_SEARCH_OPERATION,
        found: false,
        code: 'ITEM_READ_ADAPTER_NOT_READY',
        searchType: 'NAME',
        query: envelope.payload.payload.query,
        results: [],
        mutationCounts: ZERO_MUTATIONS,
      },
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  if (operation === ITEM_SEARCH_OPERATION) {
    const unsafe = envelope.payload.payload.query === 'unsafe result';
    return new Response(JSON.stringify({
      ...base,
      admissionStatus: 'ACCEPTED',
      message: 'Inventory completed the authoritative read-only item-name search without automatic selection.',
      errors: [],
      result: searchResult(envelope, unsafe
        ? { mutationCounts: { ...ZERO_MUTATIONS, stock: 1 } }
        : {}),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (operation === ITEM_VIEW_OPERATION) {
    return new Response(JSON.stringify({
      ...base,
      admissionStatus: 'ACCEPTED',
      message: 'Inventory completed the authoritative read-only operational item view.',
      errors: [],
      result: viewResult(envelope),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({
    ...base,
    admissionStatus: 'ACCEPTED',
    message: 'Inventory completed the authoritative read-only item lookup.',
    errors: [],
    result: exactResult(envelope),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function commonInput(suffix, overrides = {}) {
  return {
    envelopeId: `env:training:${suffix}`,
    idempotencyKey: `idem:training:${suffix}`,
    traceId: `trace:training:${suffix}`,
    occurredAt: new Date().toISOString(),
    deviceId: 'HH-SCANOPS-001',
    storeId: 'STORE-TEST-001',
    sessionId: 'SESSION-001',
    operatorId: 'staff-001',
    operatorRole: 'staff',
    inventoryInstanceId: 'inventory-test-001',
    trustReference: 'a'.repeat(64),
    ...overrides,
  };
}

const dispatched = [];
const client = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TRAINING',
  inventoryHost: '127.0.0.1',
  inventoryPort: 8788,
  timeoutMs: 1000,
  fetchAdapter: async (_url, options = {}) => {
    const envelope = JSON.parse(options.body);
    dispatched.push({ envelope, headers: options.headers });
    return responseFor(envelope);
  },
});

const builtSearch = client.buildItemSearchEnvelope(commonInput('search-build', {
  query: 'Laundry Detergent',
  page: 1,
  limit: 20,
}));
check('search_uses_existing_canonical_lookup_transport',
  builtSearch.ok === true
    && builtSearch.buildResult.envelope.operationType === 'LOOKUP_REQUEST'
    && builtSearch.buildResult.envelope.payload.operation === ITEM_SEARCH_OPERATION
    && builtSearch.buildResult.envelope.payload.operator_role === 'staff'
    && builtSearch.buildResult.envelope.payload.payload.search_type === 'NAME'
    && builtSearch.buildResult.envelope.payload.payload.query === 'Laundry Detergent',
  builtSearch);

const builtView = client.buildItemViewEnvelope(commonInput('view-build', {
  canonicalItemId: 'item-search-001',
}));
check('view_uses_existing_canonical_lookup_transport',
  builtView.ok === true
    && builtView.buildResult.envelope.operationType === 'LOOKUP_REQUEST'
    && builtView.buildResult.envelope.payload.operation === ITEM_VIEW_OPERATION
    && builtView.buildResult.envelope.payload.payload.canonical_item_id === 'item-search-001',
  builtView);

const exact = await client.sendItemLookup(commonInput('exact', {
  lookupType: 'SKU',
  lookupValue: 'DET-2L',
}));
check('legacy_exact_lookup_remains_compatible',
  exact.ok === true
    && exact.status === 'FOUND'
    && exact.result.item.canonicalItemId === 'item-exact-001',
  exact);

const search = await client.sendItemSearch(commonInput('search', {
  query: 'Laundry Detergent',
  page: 1,
  limit: 20,
}));
check('item_name_search_returns_explicit_candidates',
  search.ok === true
    && search.status === 'SEARCH_RESULTS'
    && search.result.operation === ITEM_SEARCH_OPERATION
    && search.result.autoSelected === false
    && search.result.results.length === 2
    && search.result.results[1].lifecycleStatus === 'INACTIVE',
  search);
check('item_name_search_has_exact_zero_mutation_evidence',
  Object.values(search.result.mutationCounts).every((value) => value === 0)
    && search.inventoryMutationAttempted === false
    && search.scanOpsMutationAttempted === false,
  search);

const noResults = await client.sendItemSearch(commonInput('search-none', {
  query: 'missing item',
  page: 1,
  limit: 20,
}));
check('item_name_search_no_results_is_explicit',
  noResults.ok === true
    && noResults.status === 'NO_RESULTS'
    && noResults.result.found === false
    && noResults.result.results.length === 0,
  noResults);

const view = await client.sendItemView(commonInput('view', {
  canonicalItemId: 'item-search-001',
}));
check('selected_candidate_opens_operational_item_view',
  view.ok === true
    && view.status === 'ITEM_VIEW_READY'
    && view.result.operation === ITEM_VIEW_OPERATION
    && view.result.item.itemName === 'Laundry Detergent 2L'
    && view.result.item.storageGuidance.includes('cool dry place'),
  view);

const missingView = await client.sendItemView(commonInput('view-missing', {
  canonicalItemId: 'item-missing',
}));
check('missing_canonical_item_returns_item_not_found',
  missingView.ok === true
    && missingView.status === 'ITEM_NOT_FOUND'
    && missingView.result.item === null,
  missingView);

const roleBlocked = await client.sendItemSearch(commonInput('role-blocked', {
  operatorRole: 'cashier',
  query: 'detergent',
}));
check('unsupported_role_is_blocked_before_dispatch',
  roleBlocked.ok === false
    && roleBlocked.dispatchAttempted === false
    && roleBlocked.blockers.includes('ITEM_READ_ROLE_BLOCKED'),
  roleBlocked);

const unavailable = await client.sendItemSearch(commonInput('auth-unavailable', {
  query: 'auth unavailable',
}));
check('inventory_authorisation_failure_is_fail_closed',
  unavailable.ok === false
    && unavailable.status === 'AUTHORIZATION_UNAVAILABLE'
    && unavailable.admissionStatus === 'SERVICE_UNAVAILABLE'
    && unavailable.result.results.length === 0,
  unavailable);

const unsafe = await client.sendItemSearch(commonInput('unsafe', {
  query: 'unsafe result',
}));
check('nonzero_mutation_evidence_is_rejected',
  unsafe.ok === false
    && unsafe.status === 'REJECTED'
    && unsafe.receiptValid === false
    && unsafe.validationErrors.some((error) => error.field === 'result.mutationCounts.stock'),
  unsafe);

check('new_reads_use_phase39_0f5_header_without_new_endpoint',
  dispatched.length === 7
    && dispatched.every(({ envelope }) => envelope.operationType === 'LOOKUP_REQUEST')
    && dispatched.filter(({ envelope }) => envelope.payload.operation).every(({ headers }) => (
      headers['X-Invyra-Bridge-Phase'] === '39-0F5'
      && headers['X-Invyra-Bridge-Client'] === 'scanops-item-read-client-v1'
    )),
  dispatched);

check('scanops_never_receives_or_sends_inventory_credentials',
  dispatched.every(({ envelope }) => {
    const text = JSON.stringify(envelope);
    return !text.includes('accessToken')
      && !text.includes('base44_access_token')
      && !text.includes('secret-never-returned');
  }),
  dispatched);

const scanSource = readFileSync(new URL('../src/pages/Scan.jsx', import.meta.url), 'utf8');
const connectivitySource = readFileSync(new URL('../src/lib/scanOpsLiveConnectivity.js', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../src/inventory-bridge/itemLookup/v1/scanOpsItemLookupClientV1.js', import.meta.url), 'utf8');

check('ui_exposes_calm_two_mode_workflow',
  scanSource.includes('Scan / SKU')
    && scanSource.includes('Search name')
    && scanSource.includes('data-phase39-0f5-item-search-view'),
  'Scan.jsx');
check('ui_never_auto_selects_search_candidates',
  scanSource.includes('No auto-select')
    && scanSource.includes('View this item')
    && !scanSource.includes('results[0]'),
  'Scan.jsx');
check('ui_exposes_authoritative_operational_view',
  scanSource.includes('Operational item view')
    && scanSource.includes('Storage guidance')
    && scanSource.includes('Minimum shelf life')
    && scanSource.includes('Zero mutations verified'),
  'Scan.jsx');
check('ui_does_not_restore_local_catalogue_path',
  !scanSource.includes('resolveInventoryIdentity')
    && !scanSource.includes('inventorySystemAdapter')
    && !scanSource.includes('navigate("/product/')
    && !scanSource.includes('localStorage'),
  'Scan.jsx');
check('connectivity_requires_governed_role_and_trusted_scope',
  connectivitySource.includes('validateGovernedItemReadRole')
    && connectivitySource.includes('runLiveItemSearch')
    && connectivitySource.includes('runLiveItemView')
    && connectivitySource.includes('trustReference: profile.trustReference'),
  'scanOpsLiveConnectivity.js');
check('client_preserves_single_handoff_endpoint',
  clientSource.includes("SCANOPS_ITEM_LOOKUP_CLIENT_V1_PATH = '/api/bridge/v1/handoffs'")
    && clientSource.includes('buildItemSearchEnvelope')
    && clientSource.includes('buildItemViewEnvelope')
    && !clientSource.includes('/api/bridge/v1/item-search')
    && !clientSource.includes('/api/bridge/v1/item-view'),
  'scanOpsItemLookupClientV1.js');
check('no_queue_persistence_retry_or_mutation_added',
  !scanSource.includes('setInterval(() => runNameSearch')
    && !clientSource.includes('queue.push')
    && !clientSource.includes('localStorage')
    && clientSource.includes('persistenceAttempted: false')
    && clientSource.includes('queueWriteAttempted: false')
    && clientSource.includes('inventoryMutationAttempted: false')
    && clientSource.includes('scanOpsMutationAttempted: false'),
  'Phase 39-0F5 sources');

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '39-0F5',
  repository: 'chrykoolaid/invyra-scanops',
  companionInventoryBaseline: 'de4ceca8d137d8acf409031cf986c858a792606d',
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  readiness: failures.length === 0 ? 'SCANOPS_ITEM_SEARCH_VIEW_READY' : 'FAIL',
  canonicalTransportOperation: 'LOOKUP_REQUEST',
  governedReadOperations: [ITEM_SEARCH_OPERATION, ITEM_VIEW_OPERATION],
  automaticSelectionAdded: false,
  receivingIntegrationAuthorized: false,
  liveAuthorized: false,
  productionAuthorized: false,
  mutationCounts: ZERO_MUTATIONS,
  tests: checks,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
console.log('\nSCANOPS_ITEM_SEARCH_VIEW_READY');
