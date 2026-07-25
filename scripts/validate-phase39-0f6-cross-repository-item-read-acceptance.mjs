#!/usr/bin/env node
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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

const ACTIVE_ITEM = Object.freeze({
  canonical_item_id: 'item-cola-active',
  sku: 'COLA-1L',
  item_name: 'Cola 1L',
  short_display_name: 'Cola 1L',
  brand: 'Invyra Test Brand',
  category: 'Beverages',
  unit_of_measure: 'each',
  pack_size: '1 L',
  primary_barcode: '9300000001001',
  alternate_barcodes: ['9300000001002'],
  lifecycle_status: 'ACTIVE',
  is_active: true,
  batch_tracked: false,
  expiry_tracked: true,
  serialised: false,
  storage_guidance: 'Store in a cool dry place.',
  minimum_shelf_life_days: 30,
  updated_date: '2026-07-24T00:00:00.000Z',
});

const INACTIVE_ITEM = Object.freeze({
  canonical_item_id: 'item-cola-inactive',
  sku: 'COLA-OLD',
  item_name: 'Cola Legacy',
  short_display_name: 'Cola Legacy',
  brand: 'Invyra Test Brand',
  category: 'Beverages',
  unit_of_measure: 'each',
  pack_size: '1 L',
  primary_barcode: '9300000001999',
  alternate_barcodes: [],
  lifecycle_status: 'INACTIVE',
  is_active: false,
  batch_tracked: false,
  expiry_tracked: false,
  serialised: false,
  storage_guidance: 'Do not replenish.',
  minimum_shelf_life_days: null,
  updated_date: '2026-07-20T00:00:00.000Z',
});

const inventoryRoot = process.env.INVENTORY_REPO_PATH
  ? join(process.cwd(), process.env.INVENTORY_REPO_PATH)
  : join(process.cwd(), 'inventory-repo');
const inventoryRuntimeUrl = pathToFileURL(join(
  inventoryRoot,
  'src/inventory-bridge/runtimeHost/v1/index.js',
)).href;
const { createInventoryBridgePilotRuntimeHostV1 } = await import(inventoryRuntimeUrl);

const storage = new Map();
const storageAdapter = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
globalThis.window = {
  location: { protocol: 'http:', hostname: '127.0.0.1' },
  sessionStorage: storageAdapter,
  localStorage: storageAdapter,
  setTimeout,
  clearTimeout,
};

const {
  clearLiveConnection,
  getLiveConnectionProfile,
  pairInventoryDesktop,
  runLiveBridgeHealthTest,
  runLiveItemLookup,
  runLiveItemSearch,
  runLiveItemView,
} = await import('../src/lib/scanOpsLiveConnectivity.js');

function searchProjection(item, searchRank) {
  return {
    canonical_item_id: item.canonical_item_id,
    item_name: item.item_name,
    sku: item.sku,
    brand: item.brand,
    pack_size: item.pack_size,
    unit_of_measure: item.unit_of_measure,
    primary_barcode: item.primary_barcode,
    lifecycle_status: item.lifecycle_status,
    batch_tracked: item.batch_tracked,
    expiry_tracked: item.expiry_tracked,
    search_rank: searchRank,
  };
}

const invocations = [];
const inventoryClientFactoryCredentials = [];
const inventoryClientFactory = (credentials) => {
  inventoryClientFactoryCredentials.push({
    appId: credentials.appId,
    appBaseUrl: credentials.appBaseUrl,
    functionsVersion: credentials.functionsVersion || null,
    tokenPresent: Boolean(credentials.token),
  });
  return {
    functions: {
      invoke: async (name, payload) => {
        invocations.push({ name, payload });

        if (name === 'queryInventoryItemLookup') {
          const found = payload.lookup_value === ACTIVE_ITEM.sku
            || payload.lookup_value === ACTIVE_ITEM.primary_barcode;
          return {
            data: {
              success: true,
              found,
              code: found ? 'ITEM_FOUND' : 'ITEM_NOT_FOUND',
              lookup_type: payload.lookup_type,
              lookup_value: payload.lookup_value,
              environment: payload.environment,
              catalogue_environment: 'LIVE',
              item: found ? ACTIVE_ITEM : null,
              mutation_counts: ZERO_MUTATIONS,
            },
          };
        }

        if (name === 'queryInventoryItemSearch') {
          const normalizedQuery = String(payload.query || '').trim().toLowerCase();
          const matches = normalizedQuery.includes('cola')
            ? [searchProjection(ACTIVE_ITEM, 1), searchProjection(INACTIVE_ITEM, 2)]
            : [];
          return {
            data: {
              success: true,
              code: 'ITEM_SEARCH_READY',
              search_type: 'NAME',
              query: payload.query,
              normalized_query: normalizedQuery,
              environment: payload.environment,
              catalogue_environment: 'LIVE',
              match_count: matches.length,
              match_count_complete: true,
              result_limit: payload.result_limit,
              page: payload.page,
              total_pages: 1,
              has_previous: false,
              has_next: false,
              auto_selected: false,
              platform_safeguard_reached: false,
              results: matches,
              mutation_counts: ZERO_MUTATIONS,
            },
          };
        }

        if (name === 'queryInventoryItemView') {
          const item = [ACTIVE_ITEM, INACTIVE_ITEM]
            .find((candidate) => candidate.canonical_item_id === payload.canonical_item_id) || null;
          return {
            data: {
              success: true,
              found: Boolean(item),
              code: item ? 'ITEM_VIEW_READY' : 'ITEM_NOT_FOUND',
              canonical_item_id: payload.canonical_item_id,
              environment: payload.environment,
              catalogue_environment: 'LIVE',
              item,
              mutation_counts: ZERO_MUTATIONS,
            },
          };
        }

        throw Object.assign(new Error(`Unexpected Inventory function invocation: ${name}`), {
          code: 'UNEXPECTED_INVENTORY_FUNCTION',
        });
      },
    },
  };
};

async function postJson(base, path, body) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function hasZeroMutationEvidence(result) {
  const counts = result?.result?.mutationCounts;
  return counts
    && Object.keys(counts).length === Object.keys(ZERO_MUTATIONS).length
    && Object.entries(ZERO_MUTATIONS).every(([key, value]) => counts[key] === value)
    && result.inventoryMutationAttempted === false
    && result.scanOpsMutationAttempted === false;
}

const runtime = createInventoryBridgePilotRuntimeHostV1({
  controlHost: '127.0.0.1',
  controlPort: 0,
  allowEphemeralPortsForTest: true,
  inventoryClientFactory,
});

let stopped = null;
let controlBase = null;
try {
  const control = await runtime.startControl();
  check('inventory_control_started', control.ok === true, control);
  const controlPort = control.status.control.address?.port;
  check('inventory_control_port_assigned', Number.isInteger(controlPort) && controlPort > 0, controlPort);
  controlBase = `http://127.0.0.1:${controlPort}`;

  const configured = runtime.configure({
    environment: 'TRAINING',
    bindHost: '127.0.0.1',
    advertisedHost: '127.0.0.1',
    publicPort: 0,
    storeId: 'store-phase39-0f6-cross',
    inventoryInstanceId: 'inventory-phase39-0f6-cross',
  });
  check('inventory_training_configuration_accepted', configured.ok === true, configured);

  const secretToken = 'phase39-0f6-control-only-token';
  const authorization = await postJson(
    controlBase,
    '/api/bridge-control/v1/item-read-adapter/authorize',
    {
      appId: 'inventory-app',
      accessToken: secretToken,
      appBaseUrl: 'https://example.invalid',
      functionsVersion: 'v1',
      ttlMs: 120000,
      scope: {
        environment: 'TRAINING',
        storeId: 'store-phase39-0f6-cross',
        inventoryInstanceId: 'inventory-phase39-0f6-cross',
      },
    },
  );
  check('inventory_read_adapter_authorized',
    authorization.status === 200
      && authorization.body.ok === true
      && authorization.body.status?.state === 'READY',
    authorization,
  );
  check('inventory_client_factory_received_control_credentials_once',
    inventoryClientFactoryCredentials.length === 1
      && inventoryClientFactoryCredentials[0].tokenPresent === true,
    inventoryClientFactoryCredentials,
  );

  const bridge = await runtime.startBridge();
  check('inventory_public_bridge_started', bridge.ok === true && bridge.status.state === 'ONLINE', bridge);
  const publicPort = bridge.status.bridge.address?.port;
  check('inventory_public_port_assigned', Number.isInteger(publicPort) && publicPort > 0, publicPort);

  const offer = runtime.createPairingOffer();
  check('inventory_pairing_code_created', offer.ok === true && /^\d{6}$/.test(offer.setupCode), offer);

  const session = {
    actorUserId: 'staff-phase39-0f6',
    actorRole: 'Staff',
    deviceId: 'SCANOPS-HH-P39-0F6-CROSS',
    sessionId: 'SCANOPS-SESSION-P39-0F6-CROSS',
    storeId: 'store-phase39-0f6-cross',
    environment: 'TRAINING',
  };

  const pairing = await pairInventoryDesktop({
    host: '127.0.0.1',
    port: publicPort,
    setupCode: offer.setupCode,
    session,
  });
  check('actual_cross_repository_pairing_succeeded',
    pairing.ok === true && pairing.status === 'PAIRED',
    pairing,
  );

  const profile = getLiveConnectionProfile();
  check('scanops_received_inventory_scope',
    profile?.storeId === session.storeId
      && profile?.inventoryInstanceId === 'inventory-phase39-0f6-cross'
      && profile?.environment === 'TRAINING',
    profile,
  );

  const health = await runLiveBridgeHealthTest(session);
  check('actual_http_health_connection_succeeded',
    health.ok === true
      && health.status === 'CONNECTED'
      && health.admissionStatus === 'ACCEPTED'
      && health.applicationStatus === 'NOT_APPLICABLE',
    health,
  );

  const exact = await runLiveItemLookup({
    lookupType: 'SKU',
    lookupValue: ACTIVE_ITEM.sku,
    session,
  });
  check('exact_sku_lookup_remains_compatible',
    exact.ok === true
      && exact.status === 'FOUND'
      && exact.result?.item?.canonicalItemId === ACTIVE_ITEM.canonical_item_id
      && hasZeroMutationEvidence(exact),
    exact,
  );

  const search = await runLiveItemSearch({ query: 'cola', page: 1, limit: 20, session });
  check('actual_cross_repository_name_search_succeeded',
    search.ok === true
      && search.status === 'SEARCH_RESULTS'
      && search.admissionStatus === 'ACCEPTED'
      && search.applicationStatus === 'NOT_APPLICABLE'
      && search.receiptValid === true
      && search.correlated === true,
    search,
  );
  check('search_returns_bounded_authoritative_candidates',
    search.result?.operation === 'ITEM_SEARCH_REQUEST'
      && search.result?.catalogueEnvironment === 'LIVE'
      && search.result?.matchCount === 2
      && search.result?.resultLimit === 20
      && search.result?.page === 1
      && search.result?.totalPages === 1
      && search.result?.results?.length === 2,
    search.result,
  );
  check('search_never_auto_selects_candidate',
    search.result?.autoSelected === false
      && !Object.prototype.hasOwnProperty.call(search.result || {}, 'selectedItem'),
    search.result,
  );
  check('search_has_zero_mutation_evidence', hasZeroMutationEvidence(search), search);

  const selectedActiveCandidate = search.result.results
    .find((item) => item.canonicalItemId === ACTIVE_ITEM.canonical_item_id);
  check('operator_can_explicitly_select_active_candidate', Boolean(selectedActiveCandidate), search.result.results);

  const activeView = await runLiveItemView({
    canonicalItemId: selectedActiveCandidate?.canonicalItemId,
    session,
  });
  check('selected_active_candidate_opens_operational_view',
    activeView.ok === true
      && activeView.status === 'ITEM_VIEW_READY'
      && activeView.result?.operation === 'ITEM_VIEW_REQUEST'
      && activeView.result?.item?.canonicalItemId === ACTIVE_ITEM.canonical_item_id
      && activeView.result?.item?.itemName === ACTIVE_ITEM.item_name
      && activeView.result?.item?.lifecycleStatus === 'ACTIVE'
      && activeView.result?.item?.isActive === true
      && hasZeroMutationEvidence(activeView),
    activeView,
  );

  const selectedInactiveCandidate = search.result.results
    .find((item) => item.canonicalItemId === INACTIVE_ITEM.canonical_item_id);
  check('operator_can_explicitly_select_inactive_candidate', Boolean(selectedInactiveCandidate), search.result.results);

  const inactiveView = await runLiveItemView({
    canonicalItemId: selectedInactiveCandidate?.canonicalItemId,
    session,
  });
  check('inactive_item_state_is_preserved_in_operational_view',
    inactiveView.ok === true
      && inactiveView.status === 'ITEM_VIEW_READY'
      && inactiveView.result?.item?.canonicalItemId === INACTIVE_ITEM.canonical_item_id
      && inactiveView.result?.item?.lifecycleStatus === 'INACTIVE'
      && inactiveView.result?.item?.isActive === false
      && hasZeroMutationEvidence(inactiveView),
    inactiveView,
  );

  const noResults = await runLiveItemSearch({ query: 'phase39 no result', page: 1, limit: 20, session });
  check('authoritative_no_results_state_is_correlated',
    noResults.ok === true
      && noResults.status === 'NO_RESULTS'
      && noResults.result?.found === false
      && noResults.result?.matchCount === 0
      && noResults.result?.results?.length === 0
      && noResults.result?.autoSelected === false
      && hasZeroMutationEvidence(noResults),
    noResults,
  );

  const invocationCountBeforeRoleBlock = invocations.length;
  const roleBlocked = await runLiveItemSearch({
    query: 'cola',
    session: { ...session, actorRole: 'Guest' },
  });
  check('blocked_operator_role_fails_before_dispatch',
    roleBlocked.ok === false
      && roleBlocked.reason === 'ITEM_READ_ROLE_BLOCKED'
      && roleBlocked.dispatchAttempted === false
      && invocations.length === invocationCountBeforeRoleBlock,
    roleBlocked,
  );

  const statusBeforeClear = runtime.getStatus();
  check('inventory_observed_expected_read_invocations',
    statusBeforeClear.itemReadAdapter?.metrics?.exactLookupCount === 1
      && statusBeforeClear.itemReadAdapter?.metrics?.itemSearchCount === 2
      && statusBeforeClear.itemReadAdapter?.metrics?.itemViewCount === 2
      && invocations.filter((entry) => entry.name === 'queryInventoryItemLookup').length === 1
      && invocations.filter((entry) => entry.name === 'queryInventoryItemSearch').length === 2
      && invocations.filter((entry) => entry.name === 'queryInventoryItemView').length === 2,
    { status: statusBeforeClear.itemReadAdapter, invocations },
  );

  const clearAuthorization = await postJson(
    controlBase,
    '/api/bridge-control/v1/item-read-adapter/clear',
    {},
  );
  check('inventory_authorization_clear_succeeded',
    clearAuthorization.status === 200 && clearAuthorization.body.ok === true,
    clearAuthorization,
  );

  const invocationCountBeforeUnavailable = invocations.length;
  const unavailable = await runLiveItemView({
    canonicalItemId: ACTIVE_ITEM.canonical_item_id,
    session,
  });
  check('cleared_authorization_fails_closed_without_stale_item',
    unavailable.ok === false
      && unavailable.status === 'AUTHORIZATION_UNAVAILABLE'
      && unavailable.admissionStatus === 'SERVICE_UNAVAILABLE'
      && unavailable.result?.item === null
      && unavailable.result?.code
      && invocations.length === invocationCountBeforeUnavailable,
    unavailable,
  );

  const statusAfterClear = runtime.getStatus();
  const serializedEvidence = JSON.stringify({
    profile,
    health,
    exact,
    search,
    activeView,
    inactiveView,
    noResults,
    roleBlocked,
    unavailable,
    statusAfterClear,
  });
  check('inventory_control_secret_never_reaches_scanops_evidence',
    !serializedEvidence.includes(secretToken)
      && !serializedEvidence.includes('accessToken')
      && !serializedEvidence.includes('Authorization')
      && !serializedEvidence.includes('Bearer '),
    serializedEvidence.includes(secretToken),
  );
  check('zero_prohibited_inventory_mutations', [
    statusAfterClear.inventoryMutationAttempted,
    statusAfterClear.stockMutationAttempted,
    statusAfterClear.ledgerMutationAttempted,
    statusAfterClear.itemMasterMutationAttempted,
    statusAfterClear.purchaseOrderMutationAttempted,
    statusAfterClear.receivingOperationAttempted,
  ].every((value) => value === false), statusAfterClear);

  clearLiveConnection();
  check('scanops_temporary_pairing_clearable', getLiveConnectionProfile() === null);
} finally {
  stopped = await runtime.stopControl();
}
check('inventory_runtime_stopped_safely', stopped?.ok === true, stopped);

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '39-0F6',
  certification: 'CROSS_REPOSITORY_ITEM_READ_ACCEPTANCE',
  repositories: [
    'chrykoolaid/invyra-base44',
    'chrykoolaid/invyra-scanops',
  ],
  commits: {
    inventory: process.env.INVENTORY_PHASE39_0F4_SHA || null,
    scanOps: process.env.GITHUB_SHA || null,
  },
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  readiness: failures.length === 0
    ? 'READY_FOR_REAL_LOCAL_OPERATOR_ACCEPTANCE'
    : 'FAIL',
  exactLookupCompatible: true,
  nameSearchAccepted: failures.length === 0,
  explicitSelectionRequired: true,
  operationalItemViewAccepted: failures.length === 0,
  liveAuthorized: false,
  productionAuthorized: false,
  receivingIntegrationAuthorized: false,
  persistenceAdded: false,
  queueWriteAdded: false,
  automaticRetryAdded: false,
  automaticSelectionAdded: false,
  mutationCounts: {
    ...ZERO_MUTATIONS,
    scanOps: 0,
  },
  tests: checks,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
console.log('SCANOPS_CROSS_REPOSITORY_ITEM_READ_ACCEPTANCE_READY');
