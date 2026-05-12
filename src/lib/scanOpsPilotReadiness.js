import { useEffect, useMemo, useState } from "react";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "./scanOpsEvents";
import { getScanOpsSession } from "./scanOpsSession";
import { hasRoleAtLeast } from "./scanOpsPermissions";

const CHECKS_STORAGE_KEY = "invyra_scanops_pilot_readiness_checks_v1";
const ISSUES_STORAGE_KEY = "invyra_scanops_pilot_readiness_issues_v1";
const RELEASE_GATE_STORAGE_KEY = "invyra_scanops_pilot_readiness_release_gate_v1";
export const PILOT_READINESS_EVENT = "scanops-pilot-readiness-updated";

export const CHECK_STATUSES = {
  NOT_TESTED: "Not tested",
  PASS: "Pass",
  FAIL: "Fail",
  BLOCKED: "Blocked",
};

export const ISSUE_SEVERITIES = ["Blocker", "High", "Medium", "Low", "Observation"];
export const ISSUE_STATUSES = ["Open", "Locally Reviewed", "Deferred", "Ready for Retest", "Closed"];

export const UAT_PACKS = [
  {
    id: "core",
    label: "Core Smoke Test",
    shortLabel: "Core",
    helper: "Fast safety check for the scanner shell and core route behavior.",
    checks: [
      { id: "home_unchanged", label: "Home launcher unchanged", expected: "Home grid stays as the accepted launcher. Stage AJ does not move, resize, or redesign Home cards." },
      { id: "keyboard_unchanged", label: "Keyboard behavior unchanged", expected: "Manual entry still opens the accepted bottom keyboard and keeps the Stage M1.7 sizing/lift behavior." },
      { id: "product_lookup_works", label: "Product Lookup works", expected: "Scanning or manual search opens the compact product result card without extra instruction walls." },
      { id: "receiving_works", label: "Receiving works", expected: "Receiving can open and add items to the current safe local receiving flow." },
      { id: "transfers_works", label: "Transfers works", expected: "Transfers remain step-based and can navigate through dispatch/receive evidence without route breakage." },
      { id: "stock_count_works", label: "Stock Count works", expected: "Stock Count opens the current count session/list surfaces and preserves quick-count hardening." },
      { id: "no_horizontal_scroll", label: "No horizontal scrolling", expected: "All AJ screens and existing workflow routes remain contained inside the handheld viewport." },
      { id: "no_toast_spam", label: "No toast spam", expected: "AJ records evidence inline. It does not introduce new toast spam or hidden pop-up behavior." },
      { id: "no_large_text_walls", label: "No large text walls", expected: "AJ uses compact cards, short helper lines, and selected-detail panels instead of dense paragraphs." },
      { id: "route_switch_stable", label: "No crash on route switching", expected: "Switching between Home, Operational Menu, AI, AH, and AJ does not crash or leave a blank route." },
      { id: "back_navigation_stable", label: "No dead-end back navigation", expected: "Back from AJ returns to the previous route/menu path without trapping the operator." },
      { id: "build_status_recorded", label: "Build/lint status recorded", expected: "Tester records whether production build and lint passed for this pilot package." },
    ],
  },
  {
    id: "roles",
    label: "Role Matrix Test",
    shortLabel: "Roles",
    helper: "Verifies Staff/Supervisor/Manager/Admin visibility and release-gate limits.",
    checks: [
      { id: "staff_own_local_only", label: "Staff sees own/local work only", expected: "Staff gets basic readiness, own smoke checks, and issue flagging without full release-gate control." },
      { id: "staff_no_manager_triage", label: "Staff cannot access manager-only triage controls", expected: "Manager/admin release actions are disabled with calm permission copy." },
      { id: "staff_cannot_close_blockers", label: "Staff cannot close blockers", expected: "Staff can create notes/issues but cannot close blocker issues or mark Pilot Ready." },
      { id: "supervisor_team_visibility", label: "Supervisor sees team-style review visibility", expected: "Supervisor can run workflow UAT checks, update statuses, add issue notes, and prepare retest evidence." },
      { id: "supervisor_no_final_ready", label: "Supervisor cannot mark final pilot ready", expected: "Supervisor release gate is visible as controlled status but final Pilot Ready remains Manager/Admin only." },
      { id: "manager_full_gate", label: "Manager sees full release gate", expected: "Manager can review packs, issues, readiness counts, and mark the local release gate when safe." },
      { id: "admin_full_gate", label: "Admin sees full release gate", expected: "Admin has the same full pilot gate visibility as Manager, still without live operational mutation." },
      { id: "blocked_actions_explain", label: "Permission-blocked actions show calm explanation", expected: "Blocked role actions explain who can perform them and do not look like errors." },
      { id: "no_mutation_bypass", label: "No role can bypass mutation locks", expected: "No role can make AJ mutate inventory, prices, promos, waste, accounting, printer routing, or desktop sync." },
      { id: "no_fake_approval_sync_print", label: "No role can fake approval/sync/print completion", expected: "Copy and actions stay honest: local evidence, contract preview, desktop not connected." },
      { id: "role_context_captured", label: "Role evidence captured", expected: "Every check update records actor, role, device, shift, and timestamp." },
      { id: "release_gate_scope_clear", label: "Release gate scope clear", expected: "The page says local pilot readiness only, not live deployment certification." },
    ],
  },
  {
    id: "workflows",
    label: "Workflow Test",
    shortLabel: "Workflows",
    helper: "Coverage across Phase 2 AA through AI without adding new operational workflows.",
    checks: [
      { id: "aa_replenishment", label: "AA Replenishment opens", expected: "Replenishment opens, scan/manual search works, and safe/deferred wording remains honest." },
      { id: "ab_price_promo", label: "AB Price Check / Promo Check opens", expected: "Price/promo verification shows result card, mismatch/review paths, and no live price mutation." },
      { id: "ac_shelf_tickets", label: "AC Shelf Ticket Queue opens", expected: "Shelf Ticket Queue uses queue/contract wording and does not claim real printer routing." },
      { id: "ad_markdown", label: "AD Markdown Approval opens", expected: "Markdown workflow shows approval request/review safety without applying live markdowns." },
      { id: "ae_waste", label: "AE Waste Review opens", expected: "Waste Review remains review/governance focused and does not write off accounting inventory." },
      { id: "af_governance", label: "AF Device / Shift Governance opens", expected: "Device, user, role, and shift context still displays and route remains stable." },
      { id: "ag_collaboration", label: "AG Session Collaboration opens", expected: "Collaboration ownership/conflict surfaces remain readable and local-safe." },
      { id: "ah_sync_contract", label: "AH Desktop Sync Contract opens", expected: "Contract Preview and Desktop Not Connected wording remain visible; payloads stay inspect-only." },
      { id: "ai_dashboard", label: "AI Store Ops Dashboard opens", expected: "Dashboard and command center open, rank exceptions, and preserve local-only triage limits." },
      { id: "workflow_result_cards", label: "Result cards display correctly", expected: "Existing compact workflow result cards remain readable with no widened layout." },
      { id: "workflow_lists_readable", label: "Batch/queue lists remain readable", expected: "Workflow lists stay compact, scroll vertically, and avoid horizontal clipping." },
      { id: "workflow_safe_actions", label: "Expected safe actions appear", expected: "Local review/note/defer/inspect actions appear where expected." },
      { id: "workflow_blocked_actions", label: "Blocked actions remain blocked", expected: "Approval, sync, print, mutation, and write-off actions remain blocked or contract-only." },
      { id: "workflow_back_navigation", label: "Workflow back navigation works", expected: "Each Phase 2 workflow can return without route dead ends." },
    ],
  },
  {
    id: "offline",
    label: "Offline / Sync Safety Test",
    shortLabel: "Offline",
    helper: "Confirms no fake live desktop, force sync, background daemon, or mutation path exists.",
    checks: [
      { id: "desktop_not_connected", label: "Desktop Not Connected remains honest", expected: "The app does not imply live desktop connection in AJ, AI, or AH." },
      { id: "contract_preview_visible", label: "Contract Preview wording remains visible", expected: "AH/AJ wording makes clear this is payload validation and local preview only." },
      { id: "deferred_sync_honest", label: "Deferred sync does not pretend success", expected: "Deferred/queued items do not show completed desktop acceptance." },
      { id: "no_force_sync", label: "No Force Sync action appears", expected: "AJ does not add force sync, API transport, or background daemon controls." },
      { id: "no_background_daemon", label: "No background daemon implied", expected: "Copy does not suggest autonomous cloud sync or hidden live processing." },
      { id: "no_fake_desktop_response", label: "No fake live desktop response is shown", expected: "Desktop responses remain previews/contract evidence only." },
      { id: "payload_inspect_only", label: "View Payload remains inspect-only", expected: "Payload preview does not send, mutate, approve, or print." },
      { id: "mutation_status_clear", label: "Mutation allowed/blocked status is clear", expected: "Mutation locks are explicit for inventory, price, promo, waste, accounting, and printing." },
    ],
  },
  {
    id: "exceptions",
    label: "Exception Command Center Test",
    shortLabel: "Exceptions",
    helper: "Validates Stage AI exception visibility and local-safe command center behavior.",
    checks: [
      { id: "dashboard_opens", label: "Dashboard opens", expected: "Store Ops Dashboard opens from menu and route without blank screen." },
      { id: "priority_rank", label: "Priority exceptions rank correctly", expected: "High/review/blocked exceptions appear before lower-risk items." },
      { id: "workflow_health", label: "Workflow Health appears", expected: "Workflow Health cards summarize review, blocked, and deferred counts." },
      { id: "review_queue", label: "Review-required queue appears", expected: "Review-required items are visible in the command center filter/list." },
      { id: "blocked_queue", label: "Blocked-conflict queue appears", expected: "Blocked conflict filter/list clearly identifies blocked items." },
      { id: "deferred_queue", label: "Deferred queue appears", expected: "Deferred items appear with honest local/deferred status." },
      { id: "filters_local", label: "Filters work locally", expected: "All/High/Blocked/Review/Deferred/Waste filters update the visible local list." },
      { id: "detail_opens", label: "Exception detail opens", expected: "Selecting an exception opens source/risk/sync/mutation details." },
      { id: "view_source_safe", label: "View Source works safely", expected: "View Source routes to the relevant workflow without changing the record." },
      { id: "view_payload_safe", label: "View Payload works safely", expected: "Payload opens in inspect-only mode and does not sync or mutate." },
      { id: "local_review_note", label: "Add Local Review Note works", expected: "Notes persist locally with actor/role/date proof." },
      { id: "mark_local_reviewed", label: "Mark Locally Reviewed is local only", expected: "Supervisor+ can mark local reviewed, but no approval/mutation occurs." },
    ],
  },
  {
    id: "release",
    label: "Release Gate Test",
    shortLabel: "Release",
    helper: "Confirms pilot report, release gate wording, and no-mutation final safety checks.",
    checks: [
      { id: "report_exists", label: "Pilot Report panel exists", expected: "Report panel includes readiness, counts, coverage, open issues, context, and notes." },
      { id: "copy_report", label: "Copy Report works", expected: "Copy Report writes plain text to clipboard or fallback copy buffer with inline confirmation." },
      { id: "no_inventory_mutation", label: "No inventory mutation", expected: "AJ actions do not update stock on hand, counts, receiving, transfer, or replenishment records." },
      { id: "no_price_mutation", label: "No price mutation", expected: "AJ does not update price records or promo records." },
      { id: "no_waste_accounting_mutation", label: "No waste/accounting mutation", expected: "AJ does not create waste write-offs, accounting movements, or approval execution." },
      { id: "no_printer_routing", label: "No printer routing", expected: "AJ does not route to real printers or claim a ticket/label was printed." },
      { id: "no_real_desktop_sync", label: "No real desktop sync", expected: "AJ does not transport payloads to the desktop app or cloud." },
      { id: "report_honest_wording", label: "Report wording is honest", expected: "Report says Local UAT Evidence and does not certify live deployment." },
      { id: "manager_ready_gate", label: "Manager/Admin pilot gate works", expected: "Manager/Admin can mark Local Pilot Ready only when blockers and failed/blocked checks are cleared." },
      { id: "blockers_affect_readiness", label: "Blockers affect readiness", expected: "Open blocker issues and blocked checks keep readiness out of Pilot Ready." },
      { id: "closed_blockers_removed", label: "Closed blockers no longer count", expected: "Closed blocker issues no longer count as open blockers." },
      { id: "production_build_passes", label: "Production build passes", expected: "The package builds successfully for pilot handoff." },
    ],
  },
];

const ROLE_LEVELS = { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 };

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeRead(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(PILOT_READINESS_EVENT));
}

function getDefaultCheckState() {
  return UAT_PACKS.reduce((acc, pack) => {
    pack.checks.forEach((check) => {
      acc[check.id] = {
        checkId: check.id,
        packId: pack.id,
        status: CHECK_STATUSES.NOT_TESTED,
        note: "",
        updatedAt: null,
        updatedBy: null,
        updatedByRole: null,
        deviceId: null,
        shiftId: null,
      };
    });
    return acc;
  }, {});
}

export function getPilotCheckDefinitions() {
  return UAT_PACKS.flatMap((pack) => pack.checks.map((check) => ({ ...check, packId: pack.id, packLabel: pack.label })));
}

export function getPilotChecks() {
  return { ...getDefaultCheckState(), ...safeRead(CHECKS_STORAGE_KEY, {}) };
}

export function getPilotIssues() {
  return safeRead(ISSUES_STORAGE_KEY, []);
}

export function getReleaseGate() {
  return safeRead(RELEASE_GATE_STORAGE_KEY, {
    status: "Needs Review",
    note: "Local release gate not reviewed yet.",
    updatedAt: null,
    updatedBy: null,
    updatedByRole: null,
  });
}

export function canRunUatChecks(session = getScanOpsSession()) {
  return ROLE_LEVELS[session.actorRole] >= ROLE_LEVELS.Staff;
}

export function canClosePilotIssues(session = getScanOpsSession()) {
  return hasRoleAtLeast(session.actorRole, "Supervisor");
}

export function canMarkPilotReady(session = getScanOpsSession()) {
  return hasRoleAtLeast(session.actorRole, "Manager");
}

export function updatePilotCheck(checkId, patch = {}, session = getScanOpsSession()) {
  const checks = getPilotChecks();
  const existing = checks[checkId];
  if (!existing) return null;
  const updated = {
    ...existing,
    ...patch,
    updatedAt: nowIso(),
    updatedBy: session.actorName,
    updatedByRole: session.actorRole,
    actorId: session.actorUserId,
    deviceId: session.deviceId,
    shiftId: session.shiftId,
    shiftLabel: session.shiftLabel,
  };
  safeWrite(CHECKS_STORAGE_KEY, { ...checks, [checkId]: updated });
  createScanOpsEvent(SCANOPS_EVENT_TYPES.PILOT_UAT_CHECK_UPDATED || "PILOT_UAT_CHECK_UPDATED", {
    source_module: "ScanOps Pilot Readiness",
    status: "local_uat_check_updated",
    checkId,
    packId: updated.packId,
    checkStatus: updated.status,
    mutationAllowed: false,
  });
  return updated;
}

export function createPilotIssue(input = {}, session = getScanOpsSession()) {
  const issue = {
    issueId: makeId("pilot_issue"),
    title: String(input.title || "Untitled pilot issue").trim() || "Untitled pilot issue",
    area: input.area || "Core Smoke Test",
    severity: input.severity || "Medium",
    status: "Open",
    discoveredInPack: input.discoveredInPack || "core",
    expectedBehavior: input.expectedBehavior || "Expected behavior not recorded yet.",
    observedBehavior: input.observedBehavior || "Observed behavior not recorded yet.",
    role: session.actorRole,
    deviceId: session.deviceId,
    shiftId: session.shiftId,
    createdBy: session.actorName,
    createdByRole: session.actorRole,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    notes: [],
  };
  safeWrite(ISSUES_STORAGE_KEY, [issue, ...getPilotIssues()].slice(0, 80));
  createScanOpsEvent(SCANOPS_EVENT_TYPES.PILOT_ISSUE_CREATED || "PILOT_ISSUE_CREATED", {
    source_module: "ScanOps Pilot Readiness",
    status: "local_pilot_issue_created",
    issueId: issue.issueId,
    severity: issue.severity,
    issueStatus: issue.status,
    mutationAllowed: false,
  });
  return issue;
}

export function updatePilotIssue(issueId, patch = {}, session = getScanOpsSession()) {
  const issues = getPilotIssues();
  let updatedIssue = null;
  const next = issues.map((issue) => {
    if (issue.issueId !== issueId) return issue;
    updatedIssue = {
      ...issue,
      ...patch,
      updatedAt: nowIso(),
      updatedBy: session.actorName,
      updatedByRole: session.actorRole,
    };
    return updatedIssue;
  });
  safeWrite(ISSUES_STORAGE_KEY, next);
  if (updatedIssue) {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.PILOT_ISSUE_UPDATED || "PILOT_ISSUE_UPDATED", {
      source_module: "ScanOps Pilot Readiness",
      status: "local_pilot_issue_updated",
      issueId,
      severity: updatedIssue.severity,
      issueStatus: updatedIssue.status,
      mutationAllowed: false,
    });
  }
  return updatedIssue;
}

export function addPilotIssueNote(issueId, noteText, session = getScanOpsSession()) {
  const text = String(noteText || "").trim();
  if (!text) return null;
  const issues = getPilotIssues();
  let note = null;
  const next = issues.map((issue) => {
    if (issue.issueId !== issueId) return issue;
    note = {
      noteId: makeId("pilot_note"),
      noteText: text,
      actorName: session.actorName,
      actorRole: session.actorRole,
      deviceId: session.deviceId,
      shiftId: session.shiftId,
      createdAt: nowIso(),
    };
    return {
      ...issue,
      notes: [note, ...(issue.notes || [])],
      updatedAt: note.createdAt,
      updatedBy: session.actorName,
      updatedByRole: session.actorRole,
    };
  });
  safeWrite(ISSUES_STORAGE_KEY, next);
  if (note) {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.PILOT_ISSUE_NOTE_ADDED || "PILOT_ISSUE_NOTE_ADDED", {
      source_module: "ScanOps Pilot Readiness",
      status: "local_pilot_issue_note_added",
      issueId,
      mutationAllowed: false,
    });
  }
  return note;
}

export function updateReleaseGate(patch = {}, session = getScanOpsSession()) {
  const updated = {
    ...getReleaseGate(),
    ...patch,
    updatedAt: nowIso(),
    updatedBy: session.actorName,
    updatedByRole: session.actorRole,
    deviceId: session.deviceId,
    shiftId: session.shiftId,
  };
  safeWrite(RELEASE_GATE_STORAGE_KEY, updated);
  createScanOpsEvent(SCANOPS_EVENT_TYPES.PILOT_RELEASE_GATE_UPDATED || "PILOT_RELEASE_GATE_UPDATED", {
    source_module: "ScanOps Pilot Readiness",
    status: "local_release_gate_updated",
    releaseGateStatus: updated.status,
    mutationAllowed: false,
    liveDeploymentCertified: false,
  });
  return updated;
}

function countChecksByStatus(checks) {
  const values = Object.values(checks);
  return {
    total: values.length,
    passed: values.filter((check) => check.status === CHECK_STATUSES.PASS).length,
    failed: values.filter((check) => check.status === CHECK_STATUSES.FAIL).length,
    blocked: values.filter((check) => check.status === CHECK_STATUSES.BLOCKED).length,
    notTested: values.filter((check) => check.status === CHECK_STATUSES.NOT_TESTED).length,
  };
}

function packSummary(pack, checks) {
  const states = pack.checks.map((check) => checks[check.id]).filter(Boolean);
  return {
    ...pack,
    total: states.length,
    passed: states.filter((check) => check.status === CHECK_STATUSES.PASS).length,
    failed: states.filter((check) => check.status === CHECK_STATUSES.FAIL).length,
    blocked: states.filter((check) => check.status === CHECK_STATUSES.BLOCKED).length,
    notTested: states.filter((check) => check.status === CHECK_STATUSES.NOT_TESTED).length,
  };
}

export function getPilotReadinessModel(session = getScanOpsSession()) {
  const checks = getPilotChecks();
  const issues = getPilotIssues();
  const gate = getReleaseGate();
  const counts = countChecksByStatus(checks);
  const openIssues = issues.filter((issue) => issue.status !== "Closed");
  const openBlockers = openIssues.filter((issue) => issue.severity === "Blocker");
  const openHigh = openIssues.filter((issue) => issue.severity === "High");
  const openWarnings = openIssues.filter((issue) => ["Medium", "Low", "Observation"].includes(issue.severity));
  const ready = counts.total > 0
    && counts.passed === counts.total
    && openBlockers.length === 0
    && openHigh.length === 0
    && gate.status === "Local Pilot Ready";
  const blocked = counts.blocked > 0 || openBlockers.length > 0;
  const failed = counts.failed > 0 || openHigh.length > 0;
  const readinessStatus = ready ? "Pilot Ready" : blocked || failed ? "Not Ready" : "Needs Review";

  return {
    session,
    checks,
    checkDefinitions: getPilotCheckDefinitions(),
    issues,
    releaseGate: gate,
    counts,
    openIssues,
    openBlockers,
    openHigh,
    openWarnings,
    readinessStatus,
    packs: UAT_PACKS.map((pack) => packSummary(pack, checks)),
    context: {
      evidence: "Local UAT Evidence",
      certification: "Does not certify live deployment",
      desktop: "Desktop Not Connected",
      syncMode: "Contract Preview",
      mutation: "No inventory, price, promo, waste, accounting, printer, or desktop mutation",
      role: session.actorRole,
      deviceId: session.deviceId,
      shift: session.shiftLabel || session.shiftId,
    },
  };
}

export function buildPilotReport(model = getPilotReadinessModel(getScanOpsSession())) {
  const lines = [
    "Pilot Readiness Report",
    `Generated: ${new Date().toLocaleString()}`,
    `Evidence scope: ${model.context.evidence}`,
    `Certification: ${model.context.certification}`,
    `Role: ${model.session.actorName} · ${model.session.actorRole}`,
    `Device: ${model.session.deviceId}`,
    `Shift: ${model.session.shiftLabel || model.session.shiftId}`,
    `Readiness status: ${model.readinessStatus}`,
    `Release gate: ${model.releaseGate.status}`,
    `Completed checks: ${model.counts.passed} / ${model.counts.total}`,
    `Failed checks: ${model.counts.failed}`,
    `Blocked checks: ${model.counts.blocked}`,
    `Not tested checks: ${model.counts.notTested}`,
    `Open blockers: ${model.openBlockers.length}`,
    `Open high issues: ${model.openHigh.length}`,
    `Open warnings/observations: ${model.openWarnings.length}`,
    "",
    "Workflow coverage:",
    ...model.packs.map((pack) => `- ${pack.label}: ${pack.passed}/${pack.total} passed · ${pack.failed} failed · ${pack.blocked} blocked · ${pack.notTested} not tested`),
    "",
    "Sync safety coverage:",
    `- Desktop: ${model.context.desktop}`,
    `- Sync mode: ${model.context.syncMode}`,
    `- Mutation: ${model.context.mutation}`,
    "",
    "Open issue summary:",
    ...(model.openIssues.length ? model.openIssues.slice(0, 12).map((issue) => `- [${issue.severity}] ${issue.title} · ${issue.status} · ${issue.area}`) : ["- No open issues recorded."]),
    "",
    "Notes:",
    model.releaseGate.note || "No release-gate note recorded.",
  ];
  return lines.join("\n");
}

export function usePilotReadiness() {
  const [tick, setTick] = useState(0);
  const session = getScanOpsSession();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refresh = () => setTick((value) => value + 1);
    window.addEventListener(PILOT_READINESS_EVENT, refresh);
    window.addEventListener("scanops-session-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PILOT_READINESS_EVENT, refresh);
      window.removeEventListener("scanops-session-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return useMemo(() => getPilotReadinessModel(getScanOpsSession()), [tick, session.actorRole, session.actorUserId]);
}
