import { getLocalInventorySnapshot } from "./inventorySystemAdapter";
import { getIdentityDisplay, searchProductIdentities } from "./productIdentityResolver";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "./scanOpsEvents";
import { getScanOpsSession } from "./scanOpsSession";
import { getUnknownItemEvidence, UNKNOWN_ITEM_REVIEW_STATES, updateUnknownItemEvidence } from "./scanOpsUnknownItems";

const ALIAS_REVIEW_KEY = "invyra_scanops_product_alias_review_v1";
const IDENTITY_LINKS_KEY = "invyra_scanops_product_identity_links_v1";
const REVIEW_EVENTS_KEY = "invyra_scanops_identity_review_events_v1";

const RESOLVED_STATES = new Set([
  UNKNOWN_ITEM_REVIEW_STATES.LINKED_TO_EXISTING_PRODUCT,
  UNKNOWN_ITEM_REVIEW_STATES.REJECTED,
]);

function read(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(key, records) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(records));
  } catch {}
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clean(value) {
  return String(value ?? "").trim().toLowerCase();
}

function compact(value) {
  return clean(value).replace(/[^a-z0-9]/g, "");
}

function formatStatus(value) {
  return String(value || UNKNOWN_ITEM_REVIEW_STATES.NEEDS_REVIEW).replaceAll("_", " ");
}

function currentIdentity(session = getScanOpsSession()) {
  const now = new Date().toISOString();
  return {
    actorUserId: session.actorUserId,
    actorName: session.actorName,
    actorRole: session.actorRole,
    deviceId: session.deviceId,
    scannerId: session.scannerId,
    storeId: session.storeId,
    departmentId: session.departmentId,
    sessionId: session.sessionId,
    createdAt: now,
  };
}

function itemIdentity(item) {
  return getIdentityDisplay(item);
}

function makeCandidate(item, reason = "Possible existing product") {
  if (!item) return null;
  return {
    productId: item.productId || item.internalItemId || item.itemId || item.id,
    internalItemId: item.internalItemId || item.id,
    sku: item.sku,
    name: item.name || item.item_name || "Unnamed product",
    barcode: item.barcode || item.gtin || "",
    plu: item.plu || item.scaleCode || "",
    department: item.department || item.category || "—",
    identity: itemIdentity(item),
    reason,
    createsProduct: false,
    appliesStockDirectly: false,
    appliesPriceDirectly: false,
  };
}

function candidateKey(candidate) {
  return candidate?.productId || candidate?.internalItemId || candidate?.sku || candidate?.barcode || candidate?.name;
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = candidateKey(candidate);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fallbackCandidates(value, limit = 3) {
  const items = getLocalInventorySnapshot().items || [];
  const packed = compact(value);
  const barcodeLike = /^\d{8,14}$/.test(String(value || "").trim());
  const pluLike = /^\d{3,5}$/.test(String(value || "").trim());
  let ranked = items;

  if (pluLike) {
    ranked = items.filter((item) => item.plu || item.scaleCode || item.isWeighted || item.requiresScale);
  } else if (barcodeLike) {
    ranked = items.filter((item) => item.barcode || item.gtin || item.barcodeAliases?.length || item.barcodes?.length);
  } else if (packed) {
    ranked = items.filter((item) => [item.name, item.sku, item.department, item.category, ...(item.aliases || [])].some((entry) => compact(entry).includes(packed) || packed.includes(compact(entry))));
  }

  return ranked.slice(0, limit).map((item) => makeCandidate(item, barcodeLike ? "Candidate for barcode alias review" : pluLike ? "Candidate for PLU review" : "Candidate from product identity data"));
}

export function findIdentityReviewCandidates(evidence, limit = 3) {
  const value = evidence?.enteredCode || evidence?.entered_code || "";
  const note = evidence?.note || evidence?.evidenceNote || "";
  const inventoryItems = getLocalInventorySnapshot().items || [];
  const exactCandidates = searchProductIdentities(value, inventoryItems, limit).map((match) => makeCandidate(match.item, match.displayReason));
  const noteCandidates = note && clean(note).length >= 2 ? searchProductIdentities(note, inventoryItems, limit).map((match) => makeCandidate(match.item, `Matched evidence note · ${match.displayReason}`)) : [];
  return uniqueCandidates([...exactCandidates, ...noteCandidates, ...fallbackCandidates(value, limit)]).slice(0, limit);
}

function isAliasReviewEvidence(evidence) {
  return /^\d{8,14}$/.test(String(evidence?.enteredCode || "").trim());
}

function isPluIssueEvidence(evidence) {
  return /^\d{3,5}$/.test(String(evidence?.enteredCode || "").trim());
}

function enrichEvidence(evidence) {
  const status = evidence.status || UNKNOWN_ITEM_REVIEW_STATES.NEEDS_REVIEW;
  const candidates = findIdentityReviewCandidates(evidence, 3);
  return {
    ...evidence,
    reviewId: evidence.evidenceId,
    status,
    statusLabel: formatStatus(status),
    queueType: isPluIssueEvidence(evidence) ? "plu_issue" : isAliasReviewEvidence(evidence) ? "alias_review" : "unknown_item",
    candidates,
    createsProduct: false,
    appliesStockDirectly: false,
    appliesPriceDirectly: false,
  };
}

export function getProductAliasReviews() {
  return read(ALIAS_REVIEW_KEY);
}

export function getProductIdentityLinks() {
  return read(IDENTITY_LINKS_KEY);
}

export function getIdentityReviewEvents() {
  return read(REVIEW_EVENTS_KEY);
}

export function getProductIdentityReviewQueues() {
  const evidence = getUnknownItemEvidence().map(enrichEvidence);
  const pending = evidence.filter((entry) => !RESOLVED_STATES.has(entry.status));
  const resolved = evidence.filter((entry) => RESOLVED_STATES.has(entry.status));
  const aliasConflicts = buildAliasConflictQueue(evidence);
  const pluIssues = buildPluIssueQueue(evidence);
  return {
    needsReview: pending,
    aliasConflicts,
    pluIssues,
    resolved,
    allEvidence: evidence,
    links: getProductIdentityLinks(),
    aliasReview: getProductAliasReviews(),
    reviewEvents: getIdentityReviewEvents(),
  };
}

export function getProductIdentityReviewSummary() {
  const queues = getProductIdentityReviewQueues();
  return {
    needsReview: queues.needsReview.length,
    aliasConflicts: queues.aliasConflicts.length,
    pluIssues: queues.pluIssues.length,
    resolved: queues.resolved.length,
    links: queues.links.length,
    events: queues.reviewEvents.length,
  };
}

function buildAliasConflictQueue(evidence) {
  const linksByCode = new Map();
  getProductIdentityLinks().forEach((link) => {
    const code = clean(link.enteredCode);
    if (!code) return;
    const list = linksByCode.get(code) || [];
    linksByCode.set(code, [...list, link]);
  });

  const linkedConflicts = [...linksByCode.entries()].flatMap(([code, links]) => {
    const productIds = new Set(links.map((link) => link.targetProductId));
    if (productIds.size <= 1) return [];
    return [{ conflictId: `alias_conflict_${code}`, enteredCode: links[0].enteredCode, status: "conflict", statusLabel: "conflict", sourceWorkflow: "Product Identity Review", createdBy: "System", createdRole: "Governance", createdAt: links[0].createdAt, candidates: links.map((link) => makeCandidate({ ...link, internalItemId: link.targetProductId, productId: link.targetProductId, name: link.targetName, sku: link.targetSku, barcode: link.existingBarcode, department: link.targetDepartment }, "Existing approved link uses same alias")), conflictReason: "Barcode alias is linked to more than one product in review records." }];
  });

  const pendingAliasEvidence = evidence.filter((entry) => !RESOLVED_STATES.has(entry.status) && isAliasReviewEvidence(entry));
  return [...linkedConflicts, ...pendingAliasEvidence];
}

function buildPluIssueQueue(evidence) {
  const pluEvidence = evidence.filter((entry) => !RESOLVED_STATES.has(entry.status) && isPluIssueEvidence(entry));
  const items = getLocalInventorySnapshot().items || [];
  const byPlu = new Map();
  items.forEach((item) => {
    const plu = clean(item.plu || item.scaleCode);
    if (!plu) return;
    byPlu.set(plu, [...(byPlu.get(plu) || []), item]);
  });
  const duplicatePluIssues = [...byPlu.entries()].filter(([, list]) => list.length > 1).map(([plu, list]) => ({
    conflictId: `plu_conflict_${plu}`,
    enteredCode: plu,
    status: "conflict",
    statusLabel: "PLU conflict",
    queueType: "plu_issue",
    sourceWorkflow: "Product Identity Review",
    createdBy: "System",
    createdRole: "Governance",
    createdAt: new Date().toISOString(),
    conflictReason: "Multiple active products share the same PLU/scale code.",
    candidates: list.map((item) => makeCandidate(item, "Product shares this PLU/scale code")),
    createsProduct: false,
    appliesStockDirectly: false,
    appliesPriceDirectly: false,
  }));
  return [...duplicatePluIssues, ...pluEvidence];
}

function eventTypeForAction(action) {
  if (action === "link_alias" || action === "link_product") return SCANOPS_EVENT_TYPES.PRODUCT_IDENTITY_LINK_APPROVED;
  if (action === "reject") return SCANOPS_EVENT_TYPES.PRODUCT_IDENTITY_EVIDENCE_REJECTED;
  if (action === "escalate") return SCANOPS_EVENT_TYPES.PRODUCT_IDENTITY_EVIDENCE_ESCALATED;
  if (action === "defer") return SCANOPS_EVENT_TYPES.PRODUCT_IDENTITY_EVIDENCE_DEFERRED;
  return SCANOPS_EVENT_TYPES.PRODUCT_IDENTITY_REVIEW_UPDATED;
}

function statusForAction(action) {
  if (action === "link_alias" || action === "link_product") return UNKNOWN_ITEM_REVIEW_STATES.LINKED_TO_EXISTING_PRODUCT;
  if (action === "reject") return UNKNOWN_ITEM_REVIEW_STATES.REJECTED;
  if (action === "escalate") return UNKNOWN_ITEM_REVIEW_STATES.ESCALATED;
  if (action === "defer") return UNKNOWN_ITEM_REVIEW_STATES.DEFERRED;
  return UNKNOWN_ITEM_REVIEW_STATES.NEEDS_REVIEW;
}

function labelForAction(action) {
  if (action === "link_alias") return "Linked as alias";
  if (action === "link_product") return "Linked to product";
  if (action === "reject") return "Rejected evidence";
  if (action === "escalate") return "Escalated";
  if (action === "defer") return "Deferred";
  return "Review updated";
}

export function reviewProductIdentityEvidence({ evidenceId, action, candidate = null, note = "" }) {
  const evidence = getUnknownItemEvidence().find((entry) => entry.evidenceId === evidenceId);
  if (!evidence) return null;

  const session = getScanOpsSession();
  const identity = currentIdentity(session);
  const status = statusForAction(action);
  const reviewEvent = {
    reviewEventId: makeId("identity_review_event"),
    evidenceId,
    enteredCode: evidence.enteredCode,
    action,
    actionLabel: labelForAction(action),
    status,
    note,
    targetProductId: candidate?.productId || null,
    targetSku: candidate?.sku || null,
    targetName: candidate?.name || null,
    targetDepartment: candidate?.department || null,
    createsProduct: false,
    appliesStockDirectly: false,
    appliesPriceDirectly: false,
    ...identity,
  };

  if (action === "link_alias" || action === "link_product") {
    const links = getProductIdentityLinks();
    const link = {
      linkId: makeId("identity_link"),
      evidenceId,
      enteredCode: evidence.enteredCode,
      linkType: action === "link_alias" ? "barcode_alias" : "product_identity_link",
      targetProductId: candidate?.productId || null,
      targetSku: candidate?.sku || null,
      targetName: candidate?.name || null,
      targetDepartment: candidate?.department || null,
      existingBarcode: candidate?.barcode || null,
      reviewState: "approved_no_inventory_mutation",
      createsProduct: false,
      appliesStockDirectly: false,
      appliesPriceDirectly: false,
      ...identity,
    };
    write(IDENTITY_LINKS_KEY, [link, ...links].slice(0, 120));
  }

  const aliasReviewRecord = {
    reviewId: makeId("product_alias_review"),
    evidenceId,
    enteredCode: evidence.enteredCode,
    action,
    status,
    targetProductId: candidate?.productId || null,
    targetSku: candidate?.sku || null,
    targetName: candidate?.name || null,
    createsProduct: false,
    appliesStockDirectly: false,
    appliesPriceDirectly: false,
    ...identity,
  };

  write(ALIAS_REVIEW_KEY, [aliasReviewRecord, ...getProductAliasReviews()].slice(0, 120));
  write(REVIEW_EVENTS_KEY, [reviewEvent, ...getIdentityReviewEvents()].slice(0, 160));

  const updated = updateUnknownItemEvidence(evidenceId, {
    status,
    reviewState: status,
    reviewedAt: identity.createdAt,
    reviewedBy: identity.actorName,
    reviewedRole: identity.actorRole,
    reviewAction: action,
    reviewNote: note,
    targetProductId: candidate?.productId || null,
    targetSku: candidate?.sku || null,
    targetName: candidate?.name || null,
    createsProduct: false,
    appliesStockDirectly: false,
    appliesPriceDirectly: false,
  });

  const scanEvent = createScanOpsEvent(eventTypeForAction(action), {
    source_module: "Product Identity Review",
    unknown_item_evidence_id: evidenceId,
    entered_code: evidence.enteredCode,
    target_product_id: candidate?.productId || null,
    target_sku: candidate?.sku || null,
    target_name: candidate?.name || null,
    action,
    status,
    review_event_id: reviewEvent.reviewEventId,
    creates_product: false,
    stock_mutation: false,
    price_mutation: false,
    applies_stock_directly: false,
    applies_price_directly: false,
  });

  return { evidence: updated, reviewEvent, scanEvent };
}
