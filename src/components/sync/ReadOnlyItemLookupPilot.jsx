import React, { useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  Loader2,
  PackageSearch,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { runLiveItemLookup } from '../../lib/scanOpsLiveConnectivity';

const BTN_PRIMARY = 'min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40';

function Detail({ label, value }) {
  return (
    <div className="min-w-0 rounded-2xl bg-secondary/70 px-3 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-foreground">{value || '—'}</p>
    </div>
  );
}

function resultTone(result) {
  if (!result) return '';
  if (result.ok && result.status === 'FOUND') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (result.ok && result.status === 'ITEM_NOT_FOUND') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-red-200 bg-red-50 text-red-900';
}

export default function ReadOnlyItemLookupPilot({ session }) {
  const [lookupType, setLookupType] = useState('BARCODE');
  const [lookupValue, setLookupValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState(null);

  const runLookup = async () => {
    if (busy || !lookupValue.trim()) return;
    setBusy(true);
    setLookup(null);
    try {
      setLookup(await runLiveItemLookup({
        lookupType,
        lookupValue: lookupValue.trim(),
        session,
      }));
    } catch (error) {
      setLookup({
        ok: false,
        status: 'FAILED',
        message: error?.message || 'The item lookup could not be completed.',
      });
    } finally {
      setBusy(false);
    }
  };

  const item = lookup?.result?.item;
  const mutationCounts = lookup?.result?.mutationCounts;
  const zeroMutations = mutationCounts
    && Object.values(mutationCounts).every((value) => Number(value) === 0);

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm" data-phase39-0d-item-lookup>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <PackageSearch className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Phase 39-0D · Read only</p>
          <h2 className="mt-1 text-lg font-black text-foreground">Look up an Inventory item</h2>
          <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
            Scan a barcode or enter a SKU. This cannot create an item or change stock.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[8.5rem_1fr] gap-2">
        <label className="block">
          <span className="sr-only">Lookup type</span>
          <select
            value={lookupType}
            onChange={(event) => {
              setLookupType(event.target.value);
              setLookup(null);
            }}
            className="h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="BARCODE">Barcode</option>
            <option value="SKU">SKU</option>
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Lookup value</span>
          <div className="relative">
            {lookupType === 'BARCODE'
              ? <Barcode className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              : <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />}
            <input
              value={lookupValue}
              onChange={(event) => {
                setLookupValue(event.target.value.slice(0, 128));
                setLookup(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') runLookup();
              }}
              placeholder={lookupType === 'BARCODE' ? 'Scan or enter barcode' : 'Enter exact SKU'}
              inputMode={lookupType === 'BARCODE' ? 'numeric' : 'text'}
              className="h-12 w-full rounded-2xl border border-input bg-background pl-10 pr-4 text-base font-bold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </label>
      </div>

      <button
        type="button"
        className={`mt-3 ${BTN_PRIMARY}`}
        disabled={busy || !lookupValue.trim()}
        onClick={runLookup}
      >
        {busy ? (
          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking Inventory…</span>
        ) : (
          <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Look up item</span>
        )}
      </button>

      {lookup && (
        <div className={`mt-4 rounded-3xl border p-4 ${resultTone(lookup)}`} aria-live="polite">
          <div className="flex items-start gap-3">
            {lookup.ok && lookup.status === 'FOUND'
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              : lookup.ok
                ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black">
                {lookup.status === 'FOUND'
                  ? 'Item found'
                  : lookup.status === 'ITEM_NOT_FOUND'
                    ? 'Item not found'
                    : 'Lookup needs attention'}
              </h3>
              <p className="mt-1 text-xs font-semibold leading-snug">{lookup.message}</p>
            </div>
          </div>

          {item && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Detail label="Item" value={item.itemName} />
              <Detail label="SKU" value={item.sku} />
              <Detail label="Barcode" value={item.primaryBarcode} />
              <Detail label="Status" value={item.lifecycleStatus} />
              <Detail label="Batch tracked" value={item.batchTracked ? 'Yes' : 'No'} />
              <Detail label="Expiry tracked" value={item.expiryTracked ? 'Yes' : 'No'} />
            </div>
          )}

          {lookup.ok && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/60 px-3 py-2 text-xs font-black">
              <ShieldCheck className="h-4 w-4" />
              {zeroMutations ? 'Zero mutations verified' : 'Mutation evidence unavailable'}
            </div>
          )}
          {lookup.receiptId && (
            <p className="mt-2 break-all text-[10px] font-semibold opacity-75">Receipt {lookup.receiptId}</p>
          )}
        </div>
      )}
    </section>
  );
}
