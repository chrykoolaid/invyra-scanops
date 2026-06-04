import React, { useEffect, useState } from "react";
import { Printer, Plus, Trash2, Wifi, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/scanner/PageHeader";
import { PageShell, WorkflowMain, SectionCard, MetricPill, StickyActions } from "../components/scanner/WorkflowPrimitives";

const DEFAULT_FORM = { name: "", ipAddress: "", port: 9100, labelFormat: "ZPL", labelWidth: 50, labelHeight: 30, isDefault: false, status: "active" };

function PrinterCard({ printer, onDelete, onSetDefault }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-2xl bg-primary/10">
            <Printer className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-black text-foreground truncate">{printer.name}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{printer.ipAddress}:{printer.port || 9100}</p>
          </div>
        </div>
        {printer.isDefault && (
          <span className="shrink-0 rounded-full bg-accent/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-accent">Default</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="Format" value={printer.labelFormat || "ZPL"} />
        <MetricPill label="Width" value={`${printer.labelWidth || 50}mm`} />
        <MetricPill label="Height" value={`${printer.labelHeight || 30}mm`} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {!printer.isDefault && (
          <button type="button" onClick={() => onSetDefault(printer.id)} className="min-h-10 rounded-xl bg-secondary px-3 text-xs font-black text-secondary-foreground active:bg-border">
            Set as Default
          </button>
        )}
        <button type="button" onClick={() => onDelete(printer.id)} className="min-h-10 rounded-xl bg-destructive/10 px-3 text-xs font-black text-destructive active:opacity-80 col-start-2">
          <Trash2 className="inline w-3.5 h-3.5 mr-1" />Remove
        </button>
      </div>
    </div>
  );
}

export default function PrinterSettings() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.PrinterConfig.list();
    setPrinters(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.ipAddress.trim()) return;
    setSaving(true);
    // If this is first printer or marked default, clear others
    if (form.isDefault || printers.length === 0) {
      await Promise.all(printers.map((p) => base44.entities.PrinterConfig.update(p.id, { isDefault: false })));
      form.isDefault = true;
    }
    await base44.entities.PrinterConfig.create({ ...form, port: Number(form.port) || 9100 });
    setSaving(false);
    setSaved(true);
    setShowForm(false);
    setForm(DEFAULT_FORM);
    setTimeout(() => setSaved(false), 3000);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.PrinterConfig.delete(id);
    load();
  };

  const handleSetDefault = async (id) => {
    await Promise.all(printers.map((p) => base44.entities.PrinterConfig.update(p.id, { isDefault: p.id === id })));
    load();
  };

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <PageShell>
      <PageHeader title="Printer Settings" subtitle="WiFi label printer configuration" />
      <WorkflowMain>
        {saved && (
          <div className="flex items-center gap-2 rounded-2xl bg-accent/10 border border-accent/20 px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
            <p className="text-sm font-black text-accent">Printer saved successfully.</p>
          </div>
        )}

        <SectionCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-foreground">WiFi / IP Printers</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
                Connects to label printers (Zebra, Brother, BIXOLON, etc.) on store WiFi via TCP port 9100. Printer must have a static IP assigned in your router.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-2 min-h-12 rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Printer
          </button>
        </SectionCard>

        {showForm && (
          <SectionCard className="space-y-4">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">New Printer</p>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Printer Name</span>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Backroom Zebra ZQ300" className="mt-2 h-12 w-full rounded-2xl border border-input bg-card px-4 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">IP Address</span>
              <input value={form.ipAddress} onChange={(e) => set("ipAddress", e.target.value)} placeholder="e.g. 192.168.1.100" inputMode="decimal" className="mt-2 h-12 w-full rounded-2xl border border-input bg-card px-4 text-sm font-bold font-mono text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Port</span>
                <input value={form.port} onChange={(e) => set("port", e.target.value)} inputMode="numeric" className="mt-2 h-12 w-full rounded-2xl border border-input bg-card px-4 text-sm font-bold font-mono text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Label Format</span>
                <select value={form.labelFormat} onChange={(e) => set("labelFormat", e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-input bg-card px-4 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="ZPL">ZPL (Zebra / most brands)</option>
                  <option value="ESC/POS">ESC/POS (thermal receipt)</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Label Width (mm)</span>
                <input value={form.labelWidth} onChange={(e) => set("labelWidth", e.target.value)} inputMode="numeric" className="mt-2 h-12 w-full rounded-2xl border border-input bg-card px-4 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Label Height (mm)</span>
                <input value={form.labelHeight} onChange={(e) => set("labelHeight", e.target.value)} inputMode="numeric" className="mt-2 h-12 w-full rounded-2xl border border-input bg-card px-4 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
              </label>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} className="w-5 h-5 rounded" />
              <span className="text-sm font-black text-foreground">Set as default printer</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }} className="min-h-12 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving || !form.name.trim() || !form.ipAddress.trim()} className="min-h-12 rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40">
                {saving ? "Saving…" : "Save Printer"}
              </button>
            </div>
          </SectionCard>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : printers.length === 0 ? (
          <SectionCard>
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-black text-foreground">No printers configured</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">Add a printer above to enable direct WiFi label printing from the Markdowns workflow.</p>
              </div>
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-3">
            {printers.map((p) => (
              <PrinterCard key={p.id} printer={p} onDelete={handleDelete} onSetDefault={handleSetDefault} />
            ))}
          </div>
        )}

        <SectionCard>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Setup Guide</p>
          <div className="space-y-2 text-xs font-semibold text-muted-foreground leading-relaxed">
            <p>1. Connect your label printer to the store WiFi network.</p>
            <p>2. Assign a static IP in your router settings (e.g. 192.168.1.100). This prevents the IP changing on restart.</p>
            <p>3. Add the printer above with that IP. Port 9100 is standard for all brands.</p>
            <p>4. Choose ZPL for Zebra printers, ESC/POS for thermal receipt-style printers.</p>
            <p>5. Once saved, use the "Print Label" button in the Markdowns workflow to print directly from the handheld.</p>
          </div>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}