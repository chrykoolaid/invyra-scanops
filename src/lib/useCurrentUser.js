/**
 * useCurrentUser — bridges Base44 real auth with the ScanOps session/governance system.
 * Maps Base44 user.role ("admin","user") to ScanOps roles (Admin/Manager/Supervisor/Staff).
 * Falls back to the localStorage session preview for pilot demo use.
 */
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getScanOpsSession, updateScanOpsSession } from "./scanOpsSession";

const BASE44_TO_SCANOPS_ROLE = {
  admin: "Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  user: "Staff",
};

function mapRole(base44Role) {
  return BASE44_TO_SCANOPS_ROLE[String(base44Role || "").toLowerCase()] || "Staff";
}

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then((me) => {
        if (me) {
          const scanOpsRole = mapRole(me.role);
          // Sync real identity into ScanOps session
          updateScanOpsSession({
            actorUserId: me.id,
            actorName: me.full_name || me.email || "User",
            actorRole: scanOpsRole,
          });
          setUser({ ...me, scanOpsRole });
        }
      })
      .catch(() => {
        // Not authenticated — fall through to session preview
      })
      .finally(() => setLoading(false));
  }, []);

  // Always return the live session so governance stays in sync
  const session = getScanOpsSession();

  return {
    user,
    loading,
    scanOpsRole: user?.scanOpsRole || session.actorRole || "Staff",
    actorName: user ? (user.full_name || user.email) : session.actorName,
    actorUserId: user?.id || session.actorUserId,
    isAuthenticated: !!user,
  };
}