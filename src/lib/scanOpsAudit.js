import { createScanOpsEvent, getScanOpsEvents } from "./scanOpsEvents";
import { buildEventIdentity, getScanOpsSession } from "./scanOpsSession";
import { scopeAuditEvents } from "./scanOpsPermissions";

export function createScanOpsAuditEvent(eventType, payload = {}) {
  const session = getScanOpsSession();
  return createScanOpsEvent(eventType, {
    ...buildEventIdentity(session),
    source_module: "ScanOpsOperationalMenu",
    sync_exempt: true,
    ...payload,
  });
}

export function getVisibleAuditEvents(session = getScanOpsSession()) {
  return scopeAuditEvents(getScanOpsEvents(), session);
}
