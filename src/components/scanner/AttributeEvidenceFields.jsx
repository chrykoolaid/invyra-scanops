import React from "react";
import TouchSelect from "./TouchSelect";
import { TextInputField } from "./WorkflowPrimitives";
import { QUANTITY_TYPE_OPTIONS, WEIGHT_SOURCE_OPTIONS, needsWeightedEvidence } from "../../lib/scanOpsItemAttributes";

export default function AttributeEvidenceFields({
  item,
  scanValue = "",
  expiryDate,
  onExpiryDateChange,
  lotBatch,
  onLotBatchChange,
  quantityType,
  onQuantityTypeChange,
  enteredQuantity,
  onEnteredQuantityChange,
  weightSource,
  onWeightSourceChange,
  expiryLabel = "Expiry",
  lotLabel = "Lot / Batch",
  showWeighted = true,
}) {
  const rawBarcode = scanValue || item?._searchMatch?.matchedValue || item?.barcode || item?.gtin || "";
  const weighted = showWeighted && needsWeightedEvidence(item, rawBarcode);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <TextInputField label={expiryLabel} value={expiryDate} onChange={onExpiryDateChange} type="date" />
        <TextInputField label={lotLabel} value={lotBatch} onChange={onLotBatchChange} placeholder="Optional" />
      </div>
      {weighted && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-primary">Weighted barcode candidate detected</p>
            <p className="mt-1 break-all font-mono text-[11px] font-bold text-muted-foreground">Barcode: {rawBarcode || "—"}</p>
          </div>
          <TouchSelect label="Quantity type" value={quantityType} onChange={onQuantityTypeChange} options={QUANTITY_TYPE_OPTIONS} />
          <TextInputField label="Weight" value={enteredQuantity} onChange={onEnteredQuantityChange} type="number" placeholder="Optional" />
          <TouchSelect label="Source" value={weightSource} onChange={onWeightSourceChange} options={WEIGHT_SOURCE_OPTIONS} />
        </div>
      )}
    </div>
  );
}
