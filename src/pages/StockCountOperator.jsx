import React, { useMemo, useState } from "react";
import { ClipboardList, MapPin, RotateCcw, ScanLine } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  EmptyState,
  ItemSummaryCard,
  MetricPill,
  OperatorAlert,
  PageShell,
  SectionCard,
  StickyActions,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import {
  calculateVariance,
  expectedQuantityForItem,
  STOCK_COUNT_AREA_OPTIONS,
} from "../lib/scanOpsStockCount";
import { useScanOpsSession } from "../lib/scanOpsSession";

const DEFAULT_AREA = "dairy_chilled";

function optionLabel(options, value) {
  return options.find((option) => option.id === value)?.label || options.find((option) => option.id === value)?.title || value;
}

function itemName(item) {
  return item?.name || item?.item_name || "Scanned item";
}

function itemUnit(item) {
  return item?.unitType || item?.unit_type || item?.unit || "each";
}

function primaryScanValue(item) {
  return item?.barcode || item?.gtin || item?.sku || item?.plu || item?.scaleCode || item?.name || "";
}

function varianceCopy(expected, counted, unit) {
  if (expected == null) return { title: "Expected unavailable", helper: "Record the physical count for review.", tone: "warning", icon: "⚠" };
  const variance = calculateVariance(expected, Number(counted || 0));
  if (variance === 0) return { title: "Match", helper: `Expected ${expected} ${unit} · counted ${counted} ${unit}.`, tone: "success", icon: "✓" };
  if (variance > 0) return { title: `Over by ${variance}`, helper: `Expected ${expected} ${unit} · counted ${counted} ${unit}.`, tone: "warning", icon: "▲" };
  return { title: `Under by ${Math.abs(variance)}`, helper: `Expected ${expected} ${unit} · counted ${counted} ${unit}.`, tone: "warning", icon: "▼" };
}

function CountSessionCard({ actorSession, area, lines }) {
  const variances = lines.filter((line) => line.variance !== 0 || line.expected == null).length;
  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Count Session</p>
          <h2 className="mt-1 text-base font-black text-foreground">{optionLabel(STOCK_COUNT_AREA_OPTIONS, area)}</h2>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            {actorSession.actorName || "Operator"} · {actorSession.storeName || actorSession.storeId || "Current store"} · Online
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricPill label="Items" value={lines.length} />
        <MetricPill label="Variances" value={variances} />
        <MetricPill label="Status" value="Open" />
      </div>
    </SectionCard>
  );
}

function LocationLockCard({ area, onChange }) {
  return (
    <SectionCard className="border-primary/20 bg-primary/5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <MapPin className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Current Location</p>
          <h2 className="mt-1 text-base font-black text-foreground">{optionLabel(STOCK_COUNT_AREA_OPTIONS, area)}</h2>
          <p className="mt-1 text-xs font-bold text-muted-foreground">Location is locked for this count session.</p>
        </div>
      </div>
      <div className="mt-3">
        <TouchSelect label="Change location" value={area} onChange={onChange} options={STOCK_COUNT_AREA_OPTIONS} />
      </div>
    </SectionCard>
  );
}

function CountKeypad({ value, onChange }) {
  const append = (digit) => onChange(String(value || "") === "0" ? digit : `${value || ""}${digit}`);
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "⌫"];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-3xl bg-secondary/60 p-1">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            if (key === "CLR") onChange("");
            else if (key === "⌫") onChange(String(value || "").slice(0, -1));
            else append(key);
          }}
          className="min-h-14 rounded-2xl bg-background px-3 text-lg font-black text-foreground active:scale-[0.98] active:bg-primary/10"
        >
          {key}
        </button>
      ))}
    </div>
  );
}

function SavedLinesCard({ lines }) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Session Progress</p>
          <h2 className="mt-1 text-lg font-black text-foreground">{lines.length} counted</h2>
        </div>
      </div>
      {lines.length ? (
        <div className="mt-3 space-y-2">
          {lines.slice(0, 6).map((line) => (
            <div key={line.id} className="rounded-2xl bg-secondary/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-foreground">{line.itemName}</p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">
                    Expected {line.expected == null ? "—" : line.expected} · Counted {line.counted} {line.unit}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${line.expected == null || line.variance !== 0 ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                  {line.expected == null ? "Review" : line.variance === 0 ? "Match" : line.variance > 0 ? `+${line.variance}` : line.variance}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Ready to count." helper="Scan an item to begin this count session." />
      )}
    </SectionCard>
  );
}

export default function StockCountOperator() {
  const actorSession = useScanOpsSession();
  const [scanValue, setScanValue] = useState("");
  const [area, setArea] = useState(DEFAULT_AREA);
  const [item, setItem] = useState(null);
  const [counted, setCounted] = useState("");
  const [lines, setLines] = useState([]);
  const [operatorError, setOperatorError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);

  const expected = expectedQuantityForItem(item);
  const unit = itemUnit(item || {});
  const numericCount = counted === "" ? NaN : Number(counted);
  const variance = Number.isNaN(numericCount) ? null : calculateVariance(expected, numericCount);
  const varianceState = useMemo(() => varianceCopy(expected, Number.isNaN(numericCount) ? 0 : numericCount, unit), [expected, numericCount, unit]);

  const scan = (value) => {
    const input = typeof value === "object" ? primaryScanValue(value) : String(value || "").trim();
    const found = typeof value === "object" ? value : resolveInventoryIdentity(input);
    if (!found) {
      setOperatorError({ title: "Item not found", helper: "Scan again or use barcode, SKU, PLU, or item name." });
      setLastSaved(null);
      return;
    }
    const alreadyCounted = lines.find((line) => line.sku && line.sku === found.sku);
    const nextExpected = expectedQuantityForItem(found);
    setOperatorError(alreadyCounted ? { title: "Already counted in this session", helper: "You can recount by saving this item again if the first count was wrong." } : null);
    setLastSaved(null);
    setItem(found);
    setScanValue(primaryScanValue(found));
    setCounted(nextExpected == null ? "" : String(Math.max(0, nextExpected)));
  };

  const clearItem = () => {
    setItem(null);
    setScanValue("");
    setCounted("");
    setOperatorError(null);
  };

  const saveCount = () => {
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan an item before saving a count." });
      return;
    }
    if (counted === "" || Number.isNaN(Number(counted)) || Number(counted) < 0) {
      setOperatorError({ title: "Count missing", helper: "Enter a valid physical count before saving." });
      return;
    }

    const line = {
      id: `count-${Date.now()}`,
      itemName: itemName(item),
      sku: item.sku,
      barcode: item.barcode,
      expected,
      counted: Number(counted),
      variance,
      unit,
      area,
    };

    setLines((current) => [line, ...current]);
    setLastSaved(line);
    setOperatorError(null);
    setItem(null);
    setScanValue("");
    setCounted("");
  };

  return (
    <PageShell>
      <PageHeader title="Count Stock" subtitle="Scan item, enter count, save, repeat" />
      <WorkflowHeader
        title="Count Stock"
        subtitle="Location locked · scan-first count session"
        placeholder="Scan item barcode, SKU, PLU, or name..."
        showHeaderChrome={false}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
      />
      <WorkflowMain>
        {operatorError && (
          <OperatorAlert
            title={operatorError.title}
            helper={operatorError.helper}
            tone="warning"
            actions={[{ label: "Keep Counting", onClick: () => setOperatorError(null), variant: "primary" }]}
          />
        )}

        {lastSaved && (
          <OperatorAlert
            tone="success"
            title="Count saved"
            helper={`${lastSaved.itemName} recorded. Ready for next scan.`}
          />
        )}

        <CountSessionCard actorSession={actorSession} area={area} lines={lines} />
        <LocationLockCard area={area} onChange={setArea} />

        {item ? (
          <>
            <ItemSummaryCard item={item}>
              <div className="grid grid-cols-3 gap-2">
                <MetricPill label="Expected" value={expected == null ? "—" : expected} suffix={expected == null ? "" : unit} />
                <MetricPill label="Counted" value={counted === "" ? "—" : counted} suffix={counted === "" ? "" : unit} />
                <MetricPill label="Variance" value={variance == null ? "—" : variance} suffix={variance == null ? "" : unit} />
              </div>
            </ItemSummaryCard>

            <SectionCard className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ScanLine className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Count Quantity</p>
                  <h2 className="mt-1 text-3xl font-black text-foreground">{counted === "" ? "—" : counted}</h2>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">Use the large keypad, then save count.</p>
                </div>
              </div>
              <CountKeypad value={counted} onChange={setCounted} />
              <div className={`rounded-2xl px-3 py-3 ${varianceState.tone === "success" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                <p className="text-sm font-black">{varianceState.icon} {varianceState.title}</p>
                <p className="mt-1 text-xs font-bold opacity-90">{varianceState.helper}</p>
              </div>
            </SectionCard>

            <StickyActions leftLabel="Clear Item" rightLabel="Save Count" onLeft={clearItem} onRight={saveCount} rightDisabled={counted === "" || Number(counted) < 0} />
          </>
        ) : (
          <SectionCard className="border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ScanLine className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-black leading-tight text-foreground">Ready to count</p>
                <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">Scan an item in {optionLabel(STOCK_COUNT_AREA_OPTIONS, area)} to enter a physical count.</p>
              </div>
            </div>
          </SectionCard>
        )}

        <SavedLinesCard lines={lines} />

        <SectionCard className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <RotateCcw className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">Count stays evidence-only</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">This screen records handheld count evidence only. Inventory Desktop remains the system of record.</p>
            </div>
          </div>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}
