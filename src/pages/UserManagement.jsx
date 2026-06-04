import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { PageShell, WorkflowMain, SectionCard } from "../components/scanner/WorkflowPrimitives";
import PageHeader from "../components/scanner/PageHeader";
import { UserPlus, Users, RefreshCw, Mail, ShieldCheck } from "lucide-react";

const SCANOPS_ROLES = ["Staff", "Supervisor", "Manager", "Admin"];

const ROLE_COLORS = {
  Staff: "bg-secondary text-secondary-foreground",
  Supervisor: "bg-blue-50 text-blue-700",
  Manager: "bg-amber-50 text-amber-700",
  Admin: "bg-red-50 text-red-700",
};

function RoleBadge({ role }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${ROLE_COLORS[role] || "bg-secondary text-secondary-foreground"}`}>
      {role || "Staff"}
    </span>
  );
}

function UserCard({ user, currentUserId, onRoleChange, saving }) {
  const isSelf = user.id === currentUserId;
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{user.full_name || "Unnamed User"}</p>
          <p className="mt-0.5 break-all text-[11px] font-semibold text-muted-foreground">{user.email}</p>
          {isSelf && <p className="mt-1 text-[10px] font-black uppercase text-primary">You</p>}
        </div>
        <RoleBadge role={user.scanops_role} />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">ScanOps Role</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SCANOPS_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              disabled={saving === user.id}
              onClick={() => onRoleChange(user.id, role)}
              className={`min-h-9 rounded-xl text-xs font-black transition-colors disabled:opacity-50 ${
                user.scanops_role === role
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground active:bg-border"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Staff");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.User.list(),
      base44.auth.me(),
    ]).then(([allUsers, me]) => {
      setUsers(allUsers || []);
      setCurrentUser(me);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    setSaving(userId);
    await base44.entities.User.update(userId, { scanops_role: newRole });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, scanops_role: newRole } : u));
    setSaving(null);
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    setInviteMsg(null);
    await base44.users.inviteUser(email, "user");
    setInviteMsg({ type: "success", text: `Invite sent to ${email}. They'll be assigned Staff role on first login.` });
    setInviteEmail("");
    setInviting(false);
  };

  return (
    <PageShell>
      <PageHeader title="User Management" subtitle="Manage ScanOps roles and invite staff" />
      <WorkflowMain>

        {/* Invite */}
        <SectionCard className="space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <p className="text-sm font-black text-foreground">Invite New User</p>
          </div>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="staff@store.com"
            className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm font-bold text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Initial ScanOps Role (can be changed after)</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SCANOPS_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setInviteRole(role)}
                  className={`min-h-9 rounded-xl text-xs font-black ${inviteRole === role ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={!inviteEmail.trim() || inviting}
            onClick={handleInvite}
            className="flex w-full items-center justify-center gap-2 min-h-12 rounded-2xl bg-primary text-sm font-black text-primary-foreground disabled:opacity-40 active:scale-[0.98]"
          >
            <Mail className="h-4 w-4" />
            {inviting ? "Sending…" : "Send Invite"}
          </button>
          {inviteMsg && (
            <p className={`rounded-2xl px-3 py-2 text-xs font-bold ${inviteMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {inviteMsg.text}
            </p>
          )}
        </SectionCard>

        {/* Users list */}
        <SectionCard className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-sm font-black text-foreground">
                {loading ? "Loading…" : `${users.length} User${users.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <button type="button" onClick={load} className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-xs font-black text-secondary-foreground active:bg-border">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
          {!loading && users.length === 0 && (
            <p className="rounded-2xl bg-secondary/50 px-3 py-3 text-sm font-bold text-muted-foreground">No users found.</p>
          )}
          <div className="space-y-2">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                currentUserId={currentUser?.id}
                onRoleChange={handleRoleChange}
                saving={saving}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard className="border-border bg-background/70">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs font-bold leading-snug text-muted-foreground">Role changes take effect immediately. Staff can access standard workflows. Supervisors can access reporting and product review. Managers can access governance and store ops. Admin has full access.</p>
          </div>
        </SectionCard>

      </WorkflowMain>
    </PageShell>
  );
}