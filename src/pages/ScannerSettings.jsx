import React, { useState } from "react";
import PageHeader from "../components/scanner/PageHeader";
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  LockKeyhole,
  MonitorSmartphone,
  ScanBarcode,
  Settings,
  ShieldCheck,
  Smartphone,
  Store,
  Type,
  Users,
  Vibrate,
  Volume2,
  Wifi,
} from "lucide-react";
import { createScanOpsAuditEvent } from "../lib/scanOpsAudit";
import { SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { hasRoleAtLeast, canChangeContext, canManageOffline } from "../lib/scanOpsPermissions";
import { SCANOPS_ROLES, setScanOpsRolePreview, updateScanOpsSession, useScanOpsSession } from "../lib/scanOpsSession";
import { getNetworkMode, setNetworkMode } from "../lib/scanOpsSync";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";

const CARD = "rounded-2xl border border-border bg-card p-4 shadow-sm";
const TILE = "rounded-2xl border border-border bg-background/70 p-3 min-h-[92px] flex flex-col items-center justify-center text-center gap-2 active:scale-[0.98] transition-all";
const DEPARTMENTS = Object.freeze([
  { id: "grocery", name: "Grocery" },
  { id: "dairy", name: "Dairy" },
  { id: "deli", name: "Deli" },
  { id: "produce", name: "Produce" },
  { id: "meat", name: "Meat" },
]);

function SectionCard({ icon: Icon, title, helper, children }) {
  return (
    <section className={CARD}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-foreground">{title}</h2>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5 leading-snug">{helper}</p>
          </div>
        </div>
        <span className="text-muted-foreground text-xl leading-none">›</span>
      </div>
      {children}
    </section>
  );
}

function Tile({ icon: Icon, label, sublabel, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${TILE} ${disabled ? "opacity-50" : ""}`}>
      <Icon className="w-7 h-7 text-primary" />
      <span className="text-xs font-black text-foreground leading-tight">{label}</span>
      {sublabel && <span className="text-[10px] font-semibold text-muted-foreground leading-tight">{sublabel}</span>}
    </button>
  );
}

function ScannerTest() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const runTest = (event) => {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    const resolved = resolveInventoryIdentity(value);
    const audit = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SCANNER_TEST_SCANNED, {
      status: resolved ? "test_resolved" : "test_unresolved",
      scanned_value: value,
      resolved_item_id: resolved?.id || null,
      resolved_sku: resolved?.sku || null,
      stock_mutation: false,
    });
    setResult({ value, resolved, traceId: audit.traceId || audit.trace_id });
  };

  return (
    <form onSubmit={runTest} className="mt-3 rounded-2xl border border-border bg-background/70 p-3 space-y-2">
      <p className="text-xs font-black text-foreground">Scanner Test</p>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Scan or enter barcode / PLU" className="min-w-0 flex-1 h-11 rounded-xl border border-input bg-card px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
        <button type="submit" className="w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><ScanBarcode className="w-5 h-5" /></button>
      </div>
      {result && (
        <div className="rounded-xl bg-secondary/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
          <p className="text-foreground font-black">Input accepted · no stock mutation</p>
          <p className="truncate">Trace: {result.traceId}</p>
          <p className="truncate">{result.resolved ? `${result.resolved.name} · ${result.resolved.sku || "SKU not set"}` : "No item resolved"}</p>
        </div>
      )}
    </form>
  );
}

export default function ScannerSettings() {
  const session = useScanOpsSession();
  const [network, setNetwork] = useState(getNetworkMode());
  const isManager = hasRoleAtLeast(session.actorRole, "Manager");
  const isAdmin = hasRoleAtLeast(session.actorRole, "Admin");

  const changeNetwork = (mode) => {
    if (!canManageOffline(session)) return;
    setNetworkMode(mode);
    setNetwork(mode);
    createScanOpsAuditEvent(mode === "offline" ? SCANOPS_EVENT_TYPES.OFFLINE_MODE_ENTERED : SCANOPS_EVENT_TYPES.ONLINE_MODE_RESTORED, { status: "saved", network_mode: mode });
  };

  const changeDepartment = (departmentId) => {
    if (!canChangeContext(session)) return;
    const department = DEPARTMENTS.find((item) => item.id === departmentId);
    if (!department) return;
    updateScanOpsSession({ departmentId: department.id, departmentName: department.name });
    createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SCANOPS_SETTING_CHANGED, { status: "saved", setting_patch: { departmentId: department.id, departmentName: department.name } });
  };

  const changeRole = (role) => {
    if (!isAdmin) return;
    setScanOpsRolePreview(role);
    createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SESSION_ROLE_PREVIEW_CHANGED, { status: "role_preview_changed", preview_role: role });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Scanner Settings" subtitle="Device controls, diagnostics, users, and shift setup" />
      <main className="flex-1 px-4 py-4 pb-8 space-y-4 overflow-y-auto overflow-x-hidden" data-scanops-scroll>
        <SectionCard icon={Settings} title="Device Behaviour" helper="Configure how the scanner feels during work.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile icon={Volume2} label="Beep" sublabel="On" />
            <Tile icon={Vibrate} label="Vibration" sublabel="On" />
            <Tile icon={Type} label="Touch Size" sublabel="Large" />
            <Tile icon={CheckCircle2} label="Scan Confirm" sublabel="Required" />
          </div>
        </SectionCard>

        <SectionCard icon={HeartPulse} title="Diagnostics" helper="Test, monitor, and troubleshoot without changing stock.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile icon={ScanBarcode} label="Scanner Test" sublabel="Manual input" />
            <Tile icon={Camera} label="Camera Input" sublabel="Future" />
            <Tile icon={HeartPulse} label="Device Health" sublabel="Preview" />
            <Tile icon={ClipboardList} label="Last Scan" sublabel="Result" />
          </div>
          <ScannerTest />
        </SectionCard>

        <SectionCard icon={Smartphone} title="Shift & Device" helper="Status, context, and connectivity.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Tile icon={Users} label="Current User" sublabel={`${session.actorName} · ${session.actorRole}`} />
            <Tile icon={MonitorSmartphone} label="Device Status" sublabel={session.deviceId} />
            <Tile icon={Store} label="Store / Dept" sublabel={session.departmentName} />
            <Tile icon={BadgeCheck} label="Shift Status" sublabel={session.shiftLabel || session.shiftId} />
            <Tile icon={Wifi} label="Network" sublabel={network} />
          </div>
          {isManager && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/70 p-3">
                <p className="text-xs font-black text-foreground">Offline / Online Mode</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button type="button" onClick={() => changeNetwork("online")} className={`rounded-xl px-3 py-2 text-xs font-black border ${network === "online" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>Online</button>
                  <button type="button" onClick={() => changeNetwork("offline")} className={`rounded-xl px-3 py-2 text-xs font-black border ${network === "offline" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>Offline</button>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-3">
                <p className="text-xs font-black text-foreground">Store / Department</p>
                <select value={session.departmentId || ""} onChange={(e) => changeDepartment(e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20">
                  {DEPARTMENTS.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard icon={LockKeyhole} title="Access & Users" helper="Permissions, roles, device assignment, and approvals.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile icon={Users} label="User Management" sublabel={isManager ? "Manager" : "Manager only"} disabled={!isManager} />
            <Tile icon={BadgeCheck} label="Role Preview" sublabel={isAdmin ? "Admin" : "Admin only"} disabled={!isAdmin} />
            <Tile icon={MonitorSmartphone} label="Device Assign" sublabel="Future" disabled />
            <Tile icon={ShieldCheck} label="Admin Approval" sublabel="Controlled" disabled={!isAdmin} />
          </div>
          {isAdmin && (
            <div className="mt-3 rounded-2xl border border-border bg-background/70 p-3">
              <p className="text-xs font-black text-foreground mb-2">Role Preview</p>
              <div className="grid grid-cols-2 gap-2">
                {SCANOPS_ROLES.map((role) => (
                  <button key={role} type="button" onClick={() => changeRole(role)} className={`rounded-xl border px-3 py-2 text-xs font-black ${session.actorRole === role ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{role}</button>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-xs font-black leading-snug text-amber-800">Scanner Settings is configuration and diagnostics only. No stock, price, sync transport, or workflow mutation is triggered here.</p>
        </div>
      </main>
    </div>
  );
}
