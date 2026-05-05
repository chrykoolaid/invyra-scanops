import React from "react";
import PageHeader from "../components/scanner/PageHeader";
import InfoRow from "../components/scanner/InfoRow";
import BottomActionBar from "../components/scanner/BottomActionBar";
import {
  DollarSign,
  Package,
  MapPin,
  Clock,
  ClipboardList,
  Tags,
  Trash2,
} from "lucide-react";

const product = {
  name: "Organic Whole Milk 1L",
  sku: "SKU-00284710",
  barcode: "5012345678901",
  price: "$4.29",
  shelfQty: 6,
  backroomQty: 24,
  aisle: "Aisle 3 · Bay 12 · Shelf 2",
  expiryDays: 5,
};

export default function ProductLookup() {
  const expiryUrgent = product.expiryDays <= 7;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Product Info" />

      <main className="flex-1 px-4 py-5 pb-28 space-y-4 overflow-y-auto">
        {/* Product Identity */}
        <section className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-lg font-bold text-foreground leading-snug">
            {product.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {product.sku} · {product.barcode}
          </p>
        </section>

        {/* Price */}
        <section className="bg-card rounded-2xl border border-border px-5 py-1">
          <InfoRow icon={DollarSign} label="Price" value={product.price} />
        </section>

        {/* Stock */}
        <section className="bg-card rounded-2xl border border-border px-5 py-1">
          <div className="flex items-center gap-2 pt-3 pb-1">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Stock</span>
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground pl-7">Shelf</span>
              <span className="text-sm font-semibold text-foreground">{product.shelfQty}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground pl-7">Backroom</span>
              <span className="text-sm font-semibold text-foreground">{product.backroomQty}</span>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="bg-card rounded-2xl border border-border px-5 py-1">
          <InfoRow icon={MapPin} label="Location" value={product.aisle} />
        </section>

        {/* Expiry */}
        <section className={`rounded-2xl border px-5 py-1 ${
          expiryUrgent 
            ? "bg-destructive/5 border-destructive/20" 
            : "bg-card border-border"
        }`}>
          <InfoRow
            icon={Clock}
            label="Expiry"
            value={`${product.expiryDays} days`}
            highlight={expiryUrgent}
          />
        </section>
      </main>

      {/* Bottom Actions */}
      <BottomActionBar
        actions={[
          { icon: ClipboardList, label: "Count", variant: "primary" },
          { icon: Tags, label: "Markdown" },
          { icon: Trash2, label: "Waste" },
        ]}
      />
    </div>
  );
}