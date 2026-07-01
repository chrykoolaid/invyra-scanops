export const SCANOPS_BRIDGE_MANUAL_SYNC_PHASE = '8';
export const SCANOPS_BRIDGE_MANUAL_SYNC_COMPONENT = 'scanops_bridge_controlled_manual_sync_execution';
export const SCANOPS_BRIDGE_MANUAL_SYNC_VERSION = 'scanops-manual-sync.v0.8.0';

export const SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES = Object.freeze({
  READY: 'MANUAL_SYNC_READY',
  BLOCKED: 'MANUAL_SYNC_BLOCKED',
  EMPTY: 'MANUAL_SYNC_EMPTY',
  COMPLETED: 'MANUAL_SYNC_COMPLETED',
  PARTIAL: 'MANUAL_SYNC_PARTIAL',
  FAILED: 'MANUAL_SYNC_FAILED',
});

export const SCANOPS_BRIDGE_MANUAL_SYNC_BLOCKERS = Object.freeze({
  MANUAL_REQUEST_REQUIRED: 'manual_sync_request_required',
  QUEUE_ITEMS_REQUIRED: 'queue_items_required',
  DISPATCH_REQUIRED: 'manual_sync_dispatch_required',
  AUTO_SYNC_BLOCKED: 'auto_sync_blocked',
  BACKGROUND_REPLAY_BLOCKED: 'background_replay_blocked',
  READY_QUEUE_ITEMS_REQUIRED: 'ready_queue_items_required',
});

export const SCANOPS_BRIDGE_MANUAL_SYNC_SUCCESS_QUEUE_STATUSES = Object.freeze([
  'SYNCED',
  'DUPLICATE',
]);
