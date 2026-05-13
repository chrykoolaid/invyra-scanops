import { useEffect, useState } from "react";

const STORAGE_KEY = "invyra_scanops_session_v1";
const SESSION_EVENT = "scanops-session-updated";

export const SCANOPS_ROLES = ["Staff", "Supervisor", "Manager", "Admin"];

const ROLE_PROFILES = {
  Staff: { actorUserId: "staff_001", actorName: "Sarah M.", actorRole: "Staff" },
  Supervisor: { actorUserId: "supervisor_001", actorName: "Mika R.", actorRole: "Supervisor" },
  Manager: { actorUserId: "manager_001", actorName: "Daniel K.", actorRole: "Manager" },
  Admin: { actorUserId: "admin_001", actorName: "Invyra Admin", actorRole: "Admin" },
};

export const DEFAULT_SCANOPS_SESSION = {
  actorUserId: "staff_001",
  actorName: "Sarah M.",
  actorRole: "Staff",
  deviceId: "HH-SCANOPS-001",
  scannerId: "SCANOPS_001",
  storeId: "store_001",
  storeName: "Pilot Test Store",
  departmentId: "grocery",
  departmentName: "Grocery",
  sessionId: "session_scanops_pilot_001",
  sessionStatus: "USER_SESSION_ACTIVE",
  sessionStartedAt: null,
  shiftId: "shift_pilot_morning_001",
  shiftLabel: "Morning Shift",
  shiftStatus: "SHIFT_ACTIVE",
  shiftStartedAt: null,
  shiftEndedAt: null,
  shiftStartedBy: "Sarah M.",
  shiftEndedBy: null,
  locationId: "grocery",
  locationName: "Grocery",
  syncStatus: "SYNC_DEFERRED",
  environment: "TRAINING",
};

function readSession() {
  if (typeof window === "undefined") return DEFAULT_SCANOPS_SESSION;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SCANOPS_SESSION, ...JSON.parse(raw) } : DEFAULT_SCANOPS_SESSION;
  } catch {
    return DEFAULT_SCANOPS_SESSION;
  }
}

function writeSession(session) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
  }
  return session;
}

export function getScanOpsSession() {
  return readSession();
}

export function updateScanOpsSession(patch = {}) {
  return writeSession({ ...readSession(), ...patch });
}

export function setScanOpsRolePreview(role) {
  return ROLE_PROFILES[role] ? updateScanOpsSession(ROLE_PROFILES[role]) : readSession();
}

export function buildEventIdentity(session = readSession()) {
  const timestamp = new Date().toISOString();
  return {
    actorUserId: session.actorUserId,
    actorName: session.actorName,
    actorRole: session.actorRole,
    deviceId: session.deviceId,
    scannerId: session.scannerId,
    storeId: session.storeId,
    storeName: session.storeName,
    departmentId: session.departmentId,
    departmentName: session.departmentName,
    locationId: session.locationId || session.departmentId,
    locationName: session.locationName || session.departmentName,
    sessionId: session.sessionId,
    sessionStatus: session.sessionStatus || "USER_SESSION_ACTIVE",
    shiftId: session.shiftId,
    shiftLabel: session.shiftLabel,
    shiftStatus: session.shiftStatus,
    deviceLabel: session.deviceLabel || session.deviceId,
    syncStatus: session.syncStatus || "SYNC_DEFERRED",
    environment: session.environment,
    traceTimestamp: timestamp,
    timestamp,
    user_id: session.actorUserId,
    user_name: session.actorName,
    role: session.actorRole,
    scanner_id: session.scannerId,
    location_id: session.storeId,
    department: session.departmentName,
    shift_id: session.shiftId,
    shift_label: session.shiftLabel,
    shift_status: session.shiftStatus,
    device_label: session.deviceLabel || session.deviceId,
    sync_status: session.syncStatus || "SYNC_DEFERRED",
    created_at: timestamp,
  };
}

export function useScanOpsSession() {
  const [session, setSession] = useState(() => readSession());
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refresh = () => setSession(readSession());
    window.addEventListener(SESSION_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SESSION_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return session;
}
