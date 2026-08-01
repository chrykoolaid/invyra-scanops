import React from "react";
import { hasValue, valueOf, yesNo } from "./itemLookupHelpers";

function DetailCell({ label, value, wide = false }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-3 ${wide ? "col-span-2" : ""}`}>
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-black leading-snug text-foreground">{hasValue(value) ? value : "—"}</p>
    </div>
  );
}

function displayAlternateBarcodes(item) {
  const values = valueOf(item, ["alternateBarcodes", "alternate_barcodes"], null);
  if (!Array.isArray(values) || values.length === 0) return "—";
  return values.join(", ");
}

export default function SummaryTab({ item }) {
  if (!item) return null;
  const minimumShelfLife = valueOf(item, ["minimumShelfLifeDays", "minimum_shelf_life_days"], null);
  const minimumShelfLifeDisplay = hasValue(minimumShelfLife) ? `${minimumShelfLife} days` : "Not specified";

  return (
    <div className="space-y-3">
      <section>
        <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Identity</p>
        <div className="grid grid-cols-2 gap-2">
          <DetailCell label="Short display name" value={valueOf(item, ["shortDisplayName", "short_display_name"], "—")} wide />
          <DetailCell label="SKU" value={valueOf(item, ["sku"], "—")} />
          <DetailCell label="Unit of measure" value={valueOf(item, ["unitOfMeasure", "unit_of_measure", "uom"], "—")} />
          <DetailCell label="Brand" value={valueOf(item, ["brand"], "—")} />
          <DetailCell label="Category" value={valueOf(item, ["category"], "—")} />
          <DetailCell label="Pack size" value={valueOf(item, ["packSize", "pack_size"], "—")} />
          <DetailCell label="Primary barcode" value={valueOf(item, ["primaryBarcode", "primary_barcode"], "—")} />
          <DetailCell label="Alternate barcodes" value={displayAlternateBarcodes(item)} wide />
        </div>
      </section>

      <section>
        <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Handling</p>
        <div className="grid grid-cols-2 gap-2">
          <DetailCell label="Batch tracked" value={yesNo(valueOf(item, ["batchTracked", "batch_tracked"], null))} />
          <DetailCell label="Expiry tracked" value={yesNo(valueOf(item, ["expiryTracked", "expiry_tracked"], null))} />
          <DetailCell label="Serialised" value={yesNo(valueOf(item, ["serialised", "serialized"], null))} />
          <DetailCell label="Minimum shelf life" value={minimumShelfLifeDisplay} />
          <DetailCell label="Storage guidance" value={valueOf(item, ["storageGuidance", "storage_guidance"], "Not specified")} wide />
          <DetailCell label="Inventory updated" value={valueOf(item, ["updatedDate", "updated_date"], "—")} wide />
        </div>
      </section>
    </div>
  );
}
