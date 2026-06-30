export const SCANOPS_BRIDGE_HTTP_DISPATCH_ADAPTER_COMPONENT = 'scanops_bridge_http_dispatch_adapter_foundation';
export const SCANOPS_BRIDGE_HTTP_DISPATCH_ADAPTER_PHASE = '6';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function assertAdapterInputs(endpoint, envelope, fetchAdapter) {
  if (!isPlainObject(endpoint) || !asTrimmedString(endpoint.url)) {
    throw new Error('Inventory Desktop endpoint URL is required before HTTP dispatch.');
  }

  if (!isPlainObject(envelope) || !asTrimmedString(envelope.envelopeId)) {
    throw new Error('A valid ScanOps transport envelope is required before HTTP dispatch.');
  }

  if (typeof fetchAdapter !== 'function') {
    throw new Error('HTTP dispatch requires an injected fetch-compatible adapter.');
  }
}

export function createScanOpsBridgeHttpDispatchAdapter(fetchAdapter) {
  return async function scanOpsBridgeHttpDispatch({ endpoint, envelope, requestedAt }) {
    assertAdapterInputs(endpoint, envelope, fetchAdapter);

    const response = await fetchAdapter(endpoint.url, {
      method: 'POST',
      headers: Object.freeze({
        'Content-Type': 'application/json',
        'X-Invyra-Bridge-Client': SCANOPS_BRIDGE_HTTP_DISPATCH_ADAPTER_COMPONENT,
        'X-Invyra-Bridge-Phase': SCANOPS_BRIDGE_HTTP_DISPATCH_ADAPTER_PHASE,
      }),
      body: JSON.stringify({
        envelope,
        requestedAt,
      }),
    });

    if (!response || response.ok === false) {
      throw new Error(`Inventory Desktop bridge HTTP handoff failed with status ${response?.status || 'unknown'}.`);
    }

    if (typeof response.json !== 'function') {
      throw new Error('Inventory Desktop bridge HTTP handoff did not return a JSON receipt.');
    }

    return response.json();
  };
}
