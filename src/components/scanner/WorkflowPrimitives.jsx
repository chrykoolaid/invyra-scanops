import React from "react";
import { AlertTriangle, CheckCircle2, Info, Minus, Package, Plus, Trash2 } from "lucide-react";

export function PageShell({ children, className = "" }) {
  return <div className={`min-h-screen bg-background flex flex-col overflow-x-hidden ${className}`}>{children}</div>;
}

export function WorkflowMain({ children, className = "" }) {
  return (
    <main data-scanops-scroll className={`flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-24 space-y-3 ${className}`}>
      {children}
    </main>
  );
}

export function SectionCard({ children, className = "", ...sectionProps }) {
  return <section className={`scanops-work-card ${className}`} {...sectionProps}>{children}</section>;
}

export function ReadyCard() {
  return null;
}

export function EmptyState({ title = "Waiting for scan…", helper = "" }) {
  return <p className="px-1 py-1 text-xs font-bold leading-snug text-muted-foreground">{title}{helper ? ` · ${helper}` : ""}</p>;
}

export function OperatorAlert({ title, helper = "", tone = "warning", actions = [] }) {
  const toneMap = {
    warning: "border-amber-200 bg-amber-50/70 text-amber-800",
    danger: "border-destructive/20 bg-destructive/10 text-destructive",
    info: "border-border bg-secondary/50 text-muted-foreground",
    success: "border-primary/20 bg-primary/5 text-primary",
  };
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Info : AlertTriangle;
  const alertLabel = helper ? `${title}. ${helper}` : title;
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneMap[tone] || toneMap.warning}`} aria-label={alertLabel} title={alertLabel}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-black text-foreground">{title}</p>
          {helper && <p className="mt-1 break-words text-xs font-semibold leading-snug text-muted-foreground">{helper}</p>}
        </div>
      </div>
      {actions.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              aria-label={action.label}
              title={action.label}
              className={`min-h-10 rounded-xl px-3 text-xs font-black active:scale-[0.98] disabled:opacity-40 ${action.variant === "primary" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FieldError({ title, helper }) {
  const errorLabel = helper ? `${title}. ${helper}` : title;
  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2" aria-label={errorLabel} title={errorLabel}>
      <p className="text-xs font-black text-destructive" title={title}>{title}</p>
      {helper && <p className="mt-1 text-xs font-semibold leading-snug text-destructive/80">{helper}</p>}
    </div>
  );
}

export function TextInputField({ label, value, onChange, placeholder = "", rows = 3, type = "text" }) {
  const inputClassName = "min-h-20 w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/10";
  const useSingleLineInput = type !== "textarea" && type !== "multiline";

  return (
    <label className="block space-y-2">
      {label && <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</span>}
      {useSingleLineInput ? (
        <input
          type={type}
          value={value || ""}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          className={inputClassName}
        />
      ) : (
        <textarea
          value={value || ""}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${inputClassName} resize-none`}
        />
      )}
    </label>
  );
}

export function ItemSummaryCard({ item, children = null }) {
  if (!item) return null;
  const unit = item.unitType || item.unit_type || "each";
  const shelf = item.shelfStock ?? item.shelf_stock;
  const backroom = item.backroomStock ?? item.backroom_stock;
  const soh = item.stockOnHand ?? item.stock_on_hand;
  const identity = [item.sku && `SKU ${item.sku}`, item.barcode && `Barcode ${item.barcode}`, (item.plu || item.scaleCode) && `PLU ${item.plu || item.scaleCode}`, (item.isWeighted || item.unitType === "kg" || item.unit === "kg") && "Weighed item"].filter(Boolean).join(" · ");
  const location = [item.department, item.category, item.shelfLocation || item.location].filter(Boolean).join(" · ");
  const matchReason = item._searchMatch?.displayReason;
  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Package className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-base font-black leading-tight text-foreground">{item.name || item.item_name || "Scanned item"}</p>
          {identity && <p className="mt-1 break-all font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{identity}</p>}
          {location && <p className="mt-1 truncate text-xs font-bold text-muted-foreground">{location}</p>}
          {matchReason && <p className="mt-2 inline-flex rounded-full bg-secondary px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{matchReason}</p>}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricPill label="Shelf" value={shelf ?? "—"} suffix={shelf == null ? "" : unit} />
        <MetricPill label="Backroom" value={backroom ?? "—"} suffix={backroom == null ? "" : unit} />
        <MetricPill label="SOH" value={soh ?? shelf ?? "—"} suffix={(soh ?? shelf) == null ? "" : unit} />
      </div>
      {children && <div className="mt-3">{children}</div>}
    </SectionCard>
  );
}

export function MetricPill({ label, value, suffix = "" }) {
  const metricValue = suffix ? `${value} ${suffix}` : `${value}`;
  const metricLabel = `${label}: ${metricValue}`;
  return (
    <div className="min-w-0 rounded-2xl bg-secondary/70 px-3 py-2" aria-label={metricLabel} title={metricLabel}>
      <p className="truncate text-[10px] font-black uppercase tracking-wider text-muted-foreground" title={label}>{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-foreground" title={metricValue}>{value}{suffix ? ` ${suffix}` : ""}</p>
    </div>
  );
}

export function QuantityStepper({ label = "Quantity", value, onChange, unit = "each", min = 0 }) {
  const set = (next) => onChange?.(Math.max(min, Number(next || 0)));
  const quantityValue = `${value} ${unit}`;
  const quantityLabel = `${label}: ${quantityValue}`;
  const decreaseLabel = `Decrease ${label}`;
  const increaseLabel = `Increase ${label}`;
  return (
    <div className="space-y-2" aria-label={quantityLabel} title={quantityLabel}>
      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground" title={label}>{label}</p>
      <div className="grid grid-cols-[3.25rem_1fr_3.25rem] gap-3">
        <button type="button" onClick={() => set(Number(value || 0) - 1)} className="flex min-h-12 items-center justify-center rounded-2xl bg-secondary font-black active:bg-border" aria-label={decreaseLabel} title={decreaseLabel}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex min-h-12 flex-col items-center justify-center rounded-2xl bg-secondary/70 px-3" title={quantityValue}>
          <span className="text-2xl font-black leading-none text-foreground">{value}</span>
          <span className="mt-1 text-xs font-semibold text-muted-foreground">{unit}</span>
        </div>
        <button type="button" onClick={() => set(Number(value || 0) + 1)} className="flex min-h-12 items-center justify-center rounded-2xl bg-secondary font-black active:bg-border" aria-label={increaseLabel} title={increaseLabel}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function StickyActions({ leftLabel, rightLabel, onLeft, onRight, rightDisabled = false, leftDisabled = false }) {
  return (
    <div className="scanops-sticky-actions grid grid-cols-2 gap-3">
      <button type="button" disabled={leftDisabled} onClick={onLeft} className="min-h-12 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground active:bg-border disabled:opacity-40">
        {leftLabel}
      </button>
      <button type="button" disabled={rightDisabled} onClick={onRight} className="min-h-12 rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40">
        {rightLabel}
      </button>
    </div>
  );
}

export function DoneCard({ title, helper, rows = [] }) {
  const doneLabel = helper ? `${title}. ${helper}` : title;
  return (
    <SectionCard className="border-primary/20 bg-primary/5" aria-label={doneLabel} title={doneLabel}>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-base font-black text-foreground" title={title}>{title}</h2>
          {helper && <p className="mt-1 text-sm leading-snug text-muted-foreground">{helper}</p>}
        </div>
      </div>
      {rows.length > 0 && <div className="mt-3 space-y-2">{rows.map((row) => <InfoLine key={row.label} {...row} />)}</div>}
    </SectionCard>
  );
}

export function InfoLine({ label, value }) {
  const labelText = typeof label === "string" || typeof label === "number" ? String(label) : "Detail";
  const valueText = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const infoLabel = valueText ? `${labelText}: ${valueText}` : labelText;
  return (
    <div className="flex items-start justify-between gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0" aria-label={infoLabel} title={infoLabel}>
      <span className="text-xs font-bold text-muted-foreground" title={labelText}>{label}</span>
      <span className="break-words text-right text-xs font-black text-foreground" title={valueText || undefined}>{value}</span>
    </div>
  );
}

export function BatchList({ title = "Current batch", items = [], emptyText = "Batch is empty.", renderMeta = null, onRemove = null }) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-black text-foreground">{items.length} {items.length === 1 ? "item" : "items"}</p>
        </div>
      </div>
      {items.length ? (
        <div className="mt-3 space-y-2">
          {items.map((line) => {
            const item = line.item?.raw || line.item || {};
            const name = line.item?.itemName || item.name || item.item_name || "Scanned item";
            const unit = line.item?.unit || item.unitType || item.unit_type || "each";
            const qtyLabel = line.quantity !== undefined ? `x ${line.quantity} ${unit}` : "";
            const meta = renderMeta ? renderMeta(line) : [line.reason, line.condition, line.markdownPercent && `${line.markdownPercent}%`, line.ticketType, line.ticketReason].filter(Boolean).join(" · ");
            return (
              <div key={line.batchItemId || line.id} className="rounded-2xl bg-secondary/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-foreground">{name}</p>
                    {meta && <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{meta}</p>}
                  </div>
                  {qtyLabel && <p className="shrink-0 text-xs font-black text-foreground">{qtyLabel}</p>}
                </div>
                {onRemove && (
                  <button type="button" onClick={() => onRemove(line.batchItemId || line.id)} className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-xl bg-card px-3 text-xs font-black text-muted-foreground active:bg-border">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 px-1 text-xs font-bold text-muted-foreground">{emptyText}</p>
      )}
    </SectionCard>
  );
}