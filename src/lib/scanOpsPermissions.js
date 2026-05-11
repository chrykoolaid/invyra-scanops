const LEVELS = { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 };
const level = (role) => LEVELS[role] || LEVELS.Staff;

export function hasRoleAtLeast(role, required) {
  return level(role) >= level(required);
}

export function canApproveOverride(session) {
  return hasRoleAtLeast(session.actorRole, "Supervisor");
}

export function canManageOffline(session) {
  return hasRoleAtLeast(session.actorRole, "Manager");
}

export function canChangeContext(session) {
  return hasRoleAtLeast(session.actorRole, "Manager");
}

export function canReviewProductIdentity(session) {
  return hasRoleAtLeast(session.actorRole, "Supervisor");
}

export function productIdentityReviewScopeLabel(session) {
  if (session.actorRole === "Admin") return "All product identity evidence";
  if (session.actorRole === "Manager") return "Store product identity evidence";
  if (session.actorRole === "Supervisor") return "Team product identity evidence";
  return "Evidence submission only";
}

export function auditScopeLabel(session) {
  if (session.actorRole === "Admin") return "All scanner audit diagnostics";
  if (session.actorRole === "Manager") return "Store audit events";
  if (session.actorRole === "Supervisor") return "Team audit events";
  return "Own session audit events";
}

export function scopeAuditEvents(events, session) {
  if (session.actorRole === "Admin") return events;
  if (session.actorRole === "Manager") return events.filter((e) => (e.storeId || e.location_id) === session.storeId);
  if (session.actorRole === "Supervisor") return events.filter((e) => (e.storeId || e.location_id) === session.storeId);
  return events.filter((e) => (e.actorUserId || e.user_id) === session.actorUserId || (e.sessionId || e.session_id) === session.sessionId);
}
