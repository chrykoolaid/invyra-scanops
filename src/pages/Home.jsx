import React from "react";
import AppHeader from "../components/scanner/AppHeader";
import ActionTile from "../components/scanner/ActionTile";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { useScanOpsGovernanceContext } from "../lib/scanOpsGovernance";
import { getSyncHeaderState } from "../lib/scanOpsSync";
import {
  resolveScanOpsHomeProfile,
  SCANOPS_INDUSTRIES,
  SCANOPS_TILE_IDS,
} from "../lib/scanOpsOperationalProfile";
import {
  Search,
  ClipboardList,
  PackageOpen,
  Tags,
  Trash2,
  ArrowLeftRight,
  Clock,
  History,
  BriefcaseBusiness,
  ShoppingCart,
} from "lucide-react";

const HERO_TILE = {
  icon: Search,
  label: "Scan or Lookup Item",
  description: "Find item • stock • location",
  to: "/scan",
  minRole: "Staff",
};

const TILE_ICONS = {
  [SCANOPS_TILE_IDS.RECEIVE]: PackageOpen,
  [SCANOPS_TILE_IDS.COUNT]: ClipboardList,
  [SCANOPS_TILE_IDS.TRANSFERS]: ArrowLeftRight,
  [SCANOPS_TILE_IDS.WASTE]: Trash2,
  [SCANOPS_TILE_IDS.MARKDOWN]: Tags,
  [SCANOPS_TILE_IDS.EXPIRY]: Clock,
  [SCANOPS_TILE_IDS.ORDER]: ShoppingCart,
  [SCANOPS_TILE_IDS.MOVEMENTS]: History,
  [SCANOPS_TILE_IDS.TOOLS]: BriefcaseBusiness,
  [SCANOPS_TILE_IDS.PARTS]: PackageOpen,
  [SCANOPS_TILE_IDS.SERVICE_JOBS]: BriefcaseBusiness,
  [SCANOPS_TILE_IDS.INGREDIENTS]: PackageOpen,
  [SCANOPS_TILE_IDS.BATCH_REGULATED]: Tags,
  [SCANOPS_TILE_IDS.MINIBAR]: PackageOpen,
  [SCANOPS_TILE_IDS.HOUSEKEEPING]: ClipboardList,
  [SCANOPS_TILE_IDS.PUT_AWAY]: PackageOpen,
  [SCANOPS_TILE_IDS.REPLENISH]: ArrowLeftRight,
  [SCANOPS_TILE_IDS.PICK]: ClipboardList,
  [SCANOPS_TILE_IDS.PACK]: PackageOpen,
  [SCANOPS_TILE_IDS.DISPATCH]: ArrowLeftRight,
  [SCANOPS_TILE_IDS.CYCLE_COUNT]: ClipboardList,
  [SCANOPS_TILE_IDS.EXCEPTIONS]: BriefcaseBusiness,
};

const ROLE_LEVELS = { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 };
const roleLevel = (r) => ROLE_LEVELS[r] || 1;

function queueLabel(summary = {}) {
  const reviewCount = Number(summary.issue || 0);
  const pendingCount = Number(summary.pending || 0);
  if (reviewCount > 0) return `${reviewCount} Review`;
  if (pendingCount > 0) return `${pendingCount} Pending`;
  return "Clear";
}

function syncLabel(syncState = {}) {
  if (syncState.state === "synced") return "Ready";
  return syncState.label || "Ready";
}

function QuickInfoCard({ label, value, helper, tone = "text-slate-200" }) {
  const accessibleLabel = helper ? `${label}: ${value}. ${helper}.` : `${label}: ${value}.`;
  return (
    <div className="min-w-0 rounded-2xl bg-slate-950/45 px-2.5 py-2 text-center" aria-label={accessibleLabel} title={accessibleLabel}>
      <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 truncate text-[11px] font-black ${tone}`}>{value}</div>
      {helper && <div className="mt-0.5 truncate text-[9px] font-bold text-slate-500">{helper}</div>}
    </div>
  );
}

export default function Home() {
  const session = useScanOpsSession();
  const governance = useScanOpsGovernanceContext();
  const syncState = getSyncHeaderState();
  const currentRole = session.actorRole || "Staff";
  const operationalProfile = resolveScanOpsHomeProfile({
    industry: governance.industryProfile || session.industryProfile || SCANOPS_INDUSTRIES.RETAIL,
    locationCapabilities: governance.locationCapabilities || session.locationCapabilities || [],
    employeeWorkflowPermissions: governance.employeeWorkflowPermissions || session.employeeWorkflowPermissions || null,
    actorRole: currentRole,
  });
  const heroEnabled = roleLevel(currentRole) >= roleLevel(HERO_TILE.minRole);
  const summary = syncState.summary || {};
  const deviceLabel = governance.deviceLabel || session.deviceId || session.scannerId || "Device ready";
  const networkLabel = syncState.state === "offline" ? "Offline" : "Online";
  const syncTone = syncState.state === "offline"
    ? "text-amber-300"
    : syncState.state === "issue"
      ? "text-rose-300"
      : syncState.state === "pending"
        ? "text-blue-300"
        : "text-emerald-300";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-x-hidden">
      <AppHeader />
      <main data-scanops-scroll className="scanops-console-screen flex-1 overflow-hidden bg-slate-950 px-4 py-3 pb-24">
        <section aria-label="Primary scan task">
          <ActionTile
            icon={HERO_TILE.icon}
            label={HERO_TILE.label}
            description={HERO_TILE.description}
            to={HERO_TILE.to}
            active={heroEnabled}
            emphasis="hero"
          />
        </section>

        <section
          className="mt-3 grid grid-cols-3 gap-2"
          aria-label={`ScanOps operations control pad. ${operationalProfile.profileId} profile.`}
          data-operational-profile={operationalProfile.profileId}
        >
          {operationalProfile.tiles.map((tile) => {
            if (!tile.visible) {
              return <div key={`${tile.slot}-${tile.tileId}`} className="h-[96px] min-h-[96px]" aria-hidden="true" />;
            }
            const Icon = TILE_ICONS[tile.tileId] || BriefcaseBusiness;
            return (
              <ActionTile
                key={`${tile.slot}-${tile.tileId}`}
                icon={Icon}
                label={tile.label}
                description={tile.description}
                to={tile.to}
                active={tile.active}
                tone={tile.tone}
              />
            );
          })}
        </section>

        <section className="mt-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2" aria-label="Quick info">
          <div className="grid grid-cols-3 gap-2">
            <QuickInfoCard label="Sync" value={syncLabel(syncState)} helper={networkLabel} tone={syncTone} />
            <QuickInfoCard label="Device" value={deviceLabel} helper={governance.shiftLabel || currentRole} tone="text-blue-300" />
            <QuickInfoCard label="Queue" value={queueLabel(summary)} helper={`${summary.total || 0} total`} tone={summary.issue ? "text-rose-300" : summary.pending ? "text-blue-300" : "text-slate-200"} />
          </div>
        </section>
      </main>
    </div>
  );
}
