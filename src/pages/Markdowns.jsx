import React, { useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { DoneCard, ItemSummaryCard, MetricPill, PageShell, ReadyCard, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getMarkdownRecommendation, MARKDOWN_REASONS } from "../lib/scanOpsRules";

const DISCOUNTS = [25, 40, 50];

export default function Markdowns() {
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [reason, setReason] = useState("near_expiry");
  const [manualDiscount, setManualDiscount] = useState(null);
  const [done, setDone] = useState(null);
  const recommendation = useMemo(() => getMarkdownRecommendation(item, reason), [item, reason]);
  const discount = manualDiscount ?? recommendation.discountPercent;
  const currentPrice = Number(item?.currentPrice ?? item?.current_price ?? 0);
  const newPrice = Math.max(0, Math.round(currentPrice * (1 - discount / 100)));
  const currency = item?.currency || "₱";

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000004") || resolveInventoryIdentity("930000000004");
    setItem(found);
    setDone(null);
  };

  const addMarkdown = () => {
    if (!item) return;
    createScanOpsEvent(SCANOPS_EVENT_TYPES.MARKDOWN_APPLIED, {
      source_module: "Markdowns",
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      reason_code: reason,
      discount_percent: discount,
      current_price: currentPrice,
      markdown_price: newPrice,
      shelf_ticket_requested: true,
      status: recommendation.approvalRequired ? "review_required" : "markdown_requested",
    });
    setDone(true);
  };

  return (
    <PageShell>
      <WorkflowHeader title="Markdowns" subtitle="Apply price reduction workflow" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        {!item && <ReadyCard title="Scan item to markdown" helper="Choose the reason and discount after item lookup." />}
        {item && <>
          <ItemSummaryCard item={item} />
          <SectionCard className="space-y-3">
            <TouchSelect label="Reason" value={reason} onChange={(next) => { setReason(next); setManualDiscount(null); }} options={MARKDOWN_REASONS} />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Suggested markdown</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[recommendation.discountPercent, ...DISCOUNTS].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).map((option) => (
                  <button key={option} type="button" onClick={() => setManualDiscount(option)} className={`min-h-11 rounded-2xl text-sm font-black ${discount === option ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{option}%</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MetricPill label="Current" value={`${currency}${currentPrice || "—"}`} />
              <MetricPill label="New" value={`${currency}${newPrice || "—"}`} />
            </div>
            <div className="rounded-2xl bg-secondary/60 p-3 text-sm font-bold text-foreground">Markdown shelf ticket will be requested after save.</div>
          </SectionCard>
          {done && <DoneCard title="Markdown requested" helper="The scanner created a markdown event and shelf-ticket request. No desktop price file was changed in this stage." rows={[{ label: "Discount", value: `${discount}%` }, { label: "New price", value: `${currency}${newPrice}` }]} />}
          <StickyActions leftLabel="Review Markdown" rightLabel="Add Markdown" onLeft={() => setDone(null)} onRight={addMarkdown} />
        </>}
      </WorkflowMain>
    </PageShell>
  );
}
