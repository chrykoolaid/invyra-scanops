import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  Loader2,
  MapPin,
  PackageSearch,
  Search,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import {
  OperatorAlert,
  PageShell,
  SectionCard,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import {
  getLiveItemLookupAvailability,
  runLiveItemLookup,
} from "../lib/scanOpsLiveConnectivity";
import { useScanOpsSession } from "../lib/scanOpsSession";

const APPROVED_MUTATION_KEYS = Object.freeze([
  "inventory",
  "stock",
  "ledger",
  "item_master",
  "pricing",
  "purchase_order",
  "receiving",
]);

const BTN_PRIMARY = "min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
const BTN_SECONDARY = "min-h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm font-black text-foreground active:bg-secondary";

function valueOf(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function hasExactZeroMutationEvidence(lookup) {
  const counts = lookup?.result?.mutationCounts;
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) return false;
  const supplied = Object.keys(counts).sort();
  const approved = [...APPROVED_MUTATION_KEYS].sort();
  return supplied.length === approved.length
    && supplied.every((key, index) => key === approved[index])
    && supplied.every((key) => typeof counts[key] === "number" && counts[key] === 0)
    && lookup?.inventoryMutationAttempted === false
    && lookup?.scanOpsMutationAttempted === false;
}

function Detail({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0 rounded-2xl bg-secondary/70 px-3 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-foreground">{String(value)}</p>
    </div>
  );
}

function ConnectionRequired({ availability, onOpenConnectivity }) {
  return (
    <SectionCard className="border-amber-200 bg-amber-50 text-amber-950">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70">
          <Unplug className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black leading-tight">Inventory not connected</p>
          <p className="mt-1 text-sm font-bold leading-snug opacity-85">
            {availability?.message || "Connect and verify this ScanOps device before looking up an item."}
          </p>
          {availability?.reason && (
            <p className="mt-2 break-all font-mono text-[10px] font-bold opacity-70">{availability.reason}</p>
          )}
        </div>
      </div>
      <button type="button" className={`mt-4 ${BTN_PRIMARY}`} onClick={onOpenConnectivity}>
        Open Sync &amp; Connectivity
      </button>
    </SectionCard>
  );
}

function LookupResult({ lookup }) {
  if (!lookup) return null;

  const item = lookup?.result?.item;
  const zeroMutations = hasExactZeroMutationEvidence(lookup);
  const batchTracked = valueOf(item, ["batchTracked", "batch_tracked"]);
  const expiryTracked = valueOf(item, ["expiryTracked", "expiry_tracked"]);
  const unitOfMeasure = valueOf(item, ["unitOfMeasure", "unit_of_measure", "uom"]);
  const primaryLocation = valueOf(item, ["primaryLocation", "primary_location"]);
  const authoritativeQuantity = valueOf(item, ["authoritativeQuantity", "authoritative_quantity"]);

  if (lookup.ok && lookup.status === "FOUND" && item) {
    return (
      <SectionCard className="border-emerald-200 bg-emerald-50 text-emerald-950" data-authoritative-inventory-result>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-tight">Item found</p>
            <p className="mt-1 text-xs font-bold leading-snug opacity-80">Authoritative Inventory result</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Detail label="Item name" value={valueOf(item, ["itemName", "item_name"])} />
          <Detail label="SKU" value={valueOf(item, ["sku"])} />
          <Detail label="Primary barcode" value={valueOf(item, ["primaryBarcode", "primary_barcode"])} />
          <Detail label="Lifecycle status" value={valueOf(item, ["lifecycleStatus", "lifecycle_status"])} />
          <Detail label="Unit of measure" value={unitOfMeasure} />
          <Detail label="Primary location" value={primaryLocation} />
          <Detail label="Batch tracked" value={batchTracked === null ? null : batchTracked ? "Yes" : "No"} />
          <Detail label="Expiry tracked" value={expiryTracked === null ? null : expiryTracked ? "Yes" : "No"} />
          <Detail label="Authoritative quantity" value={authoritativeQuantity} />
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs font-black">
          <ShieldCheck className="h-4 w-4" />
          {zeroMutations ? "Zero mutations verified" : "Mutation evidence unavailable"}
        </div>
      </SectionCard>
    );
  }

  if (lookup.ok && lookup.status === "ITEM_NOT_FOUND") {
    return (
      <SectionCard className="border-amber-200 bg-amber-50 text-amber-950" data-authoritative-inventory-result>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-tight">Item not found</p>
            <p className="mt-1 font-mono text-xs font-black">ITEM_NOT_FOUND</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs font-black">
          <ShieldCheck className="h-4 w-4" />
          {zeroMutations ? "Zero mutations verified" : "Mutation evidence unavailable"}
        </div>
      </SectionCard>
    );
  }

  if (lookup.status === "AUTHORIZATION_UNAVAILABLE") {
    return (
      <SectionCard className="border-red-200 bg-red-50 text-red-950" data-authoritative-inventory-result>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-tight">Inventory read authorisation unavailable</p>
            <p className="mt-1 text-sm font-bold leading-snug opacity-85">
              Inventory Desktop must be reauthorised. This lookup was not retried and no previous result was used.
            </p>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard className="border-red-200 bg-red-50 text-red-950" data-authoritative-inventory-result>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black leading-tight">
            {lookup.status === "TIMEOUT" ? "Inventory lookup timed out" : "Lookup needs attention"}
          </p>
          <p className="mt-1 text-sm font-bold leading-snug opacity-85">
            {lookup.message || "The authoritative Inventory lookup could not be completed."}
          </p>
          {lookup.reason && (
            <p className="mt-2 break-all font-mono text-[10px] font-bold opacity-70">{lookup.reason}</p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

export default function Scan() {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const [skuValue, setSkuValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState(null);
  const [lastBarcode, setLastBarcode] = useState("");
  const [availability, setAvailability] = useState(() => getLiveItemLookupAvailability(session));
  const scannerBuffer = useRef("");
  const scannerTimer = useRef(null);
  const lookupInFlight = useRef(false);
  const lookupSequence = useRef(0);

  const refreshAvailability = useCallback(() => {
    setAvailability(getLiveItemLookupAvailability(session));
  }, [session]);

  useEffect(() => {
    refreshAvailability();
    const refresh = () => refreshAvailability();
    const interval = window.setInterval(refresh, 5_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("scanops-session-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("scanops-session-updated", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshAvailability]);

  useEffect(() => {
    if (availability.connected) return;
    lookupSequence.current += 1;
    lookupInFlight.current = false;
    setBusy(false);
    setLookup(null);
  }, [availability.connected]);

  const runLookup = useCallback(async (lookupType, rawValue) => {
    const value = String(rawValue || "").trim();
    if (!availability.connected || lookupInFlight.current || !value || value.length > 128) return;

    const sequence = lookupSequence.current + 1;
    lookupSequence.current = sequence;
    lookupInFlight.current = true;
    setBusy(true);
    setLookup(null);

    try {
      const next = await runLiveItemLookup({
        lookupType,
        lookupValue: value,
        session,
      });
      if (lookupSequence.current === sequence) setLookup(next);
    } catch (error) {
      if (lookupSequence.current === sequence) {
        setLookup({
          ok: false,
          status: "FAILED",
          reason: "LOOKUP_FAILED",
          message: error?.message || "The authoritative Inventory lookup could not be completed.",
          inventoryMutationAttempted: false,
          scanOpsMutationAttempted: false,
        });
      }
    } finally {
      if (lookupSequence.current === sequence) {
        lookupInFlight.current = false;
        setBusy(false);
        refreshAvailability();
      }
    }
  }, [availability.connected, refreshAvailability, session]);

  useEffect(() => {
    if (!availability.connected) return undefined;

    const flushScanner = () => {
      const barcode = scannerBuffer.current.trim();
      scannerBuffer.current = "";
      if (!barcode || barcode.length > 128) return;
      setLastBarcode(barcode);
      setSkuValue("");
      runLookup("BARCODE", barcode);
    };

    const onKeyDown = (event) => {
      const target = event.target;
      const typingTarget = target && (
        target.tagName === "INPUT"
        || target.tagName === "TEXTAREA"
        || target.tagName === "SELECT"
        || target.isContentEditable
      );
      if (typingTarget || event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "Enter") {
        if (scannerBuffer.current) {
          event.preventDefault();
          window.clearTimeout(scannerTimer.current);
          flushScanner();
        }
        return;
      }

      if (event.key.length === 1) {
        scannerBuffer.current += event.key;
        window.clearTimeout(scannerTimer.current);
        scannerTimer.current = window.setTimeout(flushScanner, 120);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.clearTimeout(scannerTimer.current);
      scannerBuffer.current = "";
    };
  }, [availability.connected, runLookup]);

  const connectionDetails = useMemo(() => ({
    environment: availability?.profile?.environment,
    storeId: availability?.profile?.storeId,
  }), [availability]);

  const submitSku = (event) => {
    event?.preventDefault?.();
    runLookup("SKU", skuValue);
  };

  return (
    <PageShell data-phase39-0e-operational-item-lookup>
      <PageHeader title="Lookup Item" subtitle="Authoritative Inventory lookup" />
      <WorkflowMain>
        {!availability.connected ? (
          <ConnectionRequired
            availability={availability}
            onOpenConnectivity={() => navigate("/scanner-settings/sync")}
          />
        ) : (
          <>
            <SectionCard className="border-emerald-200 bg-emerald-50 text-emerald-950">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black leading-tight">Connected to Inventory</p>
                  <p className="mt-1 text-xs font-bold leading-snug opacity-80">
                    {connectionDetails.environment} · {connectionDetails.storeId}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Barcode className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black leading-tight text-foreground">Scan barcode</p>
                  <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">
                    A valid hardware scanner barcode submits automatically.
                  </p>
                  {lastBarcode && (
                    <p className="mt-2 break-all font-mono text-[11px] font-bold text-muted-foreground">Last scan: {lastBarcode}</p>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <PackageSearch className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black leading-tight text-foreground">Enter exact SKU</p>
                  <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">
                    Item name and PLU search are not available in this certified phase.
                  </p>
                </div>
              </div>

              <form className="mt-4 space-y-3" onSubmit={submitSku}>
                <label className="block">
                  <span className="sr-only">Exact SKU</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <input
                      value={skuValue}
                      onChange={(event) => {
                        setSkuValue(event.target.value.slice(0, 128));
                        setLookup(null);
                      }}
                      placeholder="Enter exact SKU"
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="h-12 w-full rounded-2xl border border-input bg-background pl-10 pr-4 text-base font-bold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </label>
                <button type="submit" className={BTN_PRIMARY} disabled={busy || !skuValue.trim()}>
                  {busy ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking Inventory…</span>
                  ) : (
                    <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Look up SKU</span>
                  )}
                </button>
              </form>
            </SectionCard>

            {busy && !lookup && (
              <SectionCard className="border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3 text-sm font-black text-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Waiting for authoritative Inventory result…
                </div>
              </SectionCard>
            )}

            <LookupResult lookup={lookup} />

            <OperatorAlert
              tone="info"
              title="Lookup stays read-only"
              helper="No item, stock, ledger, pricing, purchase-order, Receiving, or ScanOps mutation is performed."
            />

            <button type="button" className={BTN_SECONDARY} onClick={() => navigate("/scanner-settings/sync")}>
              <MapPin className="mr-2 inline h-4 w-4" /> Open Sync &amp; Connectivity
            </button>
          </>
        )}
      </WorkflowMain>
    </PageShell>
  );
}
