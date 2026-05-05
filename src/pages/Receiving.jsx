import React, { useState } from "react";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";
import NumericKeypad from "../components/scanner/NumericKeypad";
import { CheckCircle2, ChevronRight, Minus, Plus } from "lucide-react";

const SUPPLIERS = [
  { id: 1, name: "Fresh Fields Co.", ref: "PO-2847" },
  { id: 2, name: "Dairy Direct Ltd.", ref: "PO-2848" },
  { id: 3, name: "Green Harvest", ref: "PO-2849" },
];

const MOCK_PRODUCT = {
  name: "Organic Whole Milk 1L",
  sku: "SKU-00284710",
  expectedQty: 24,
};

const ISSUES = ["Damaged", "Missing", "Extra"];

const EXPIRY_OPTIONS = ["3 days", "7 days", "14 days", "1 month", "3 months", "6+ months"];

const STEPS = {
  SUPPLIER: "supplier",
  SCAN: "scan",
  QUANTITY: "quantity",
  ISSUES: "issues",
  EXPIRY: "expiry",
  CONFIRM: "confirm",
  DONE: "done",
};

export default function Receiving() {
  const [step, setStep] = useState(STEPS.SUPPLIER);
  const [supplier, setSupplier] = useState(null);
  const [received, setReceived] = useState("");
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [expiry, setExpiry] = useState(null);

  const receivedNum = parseInt(received, 10);

  const toggleIssue = (issue) => {
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  const adjustQty = (delta) => {
    const current = receivedNum || 0;
    const next = Math.max(0, current + delta);
    setReceived(String(next));
  };

  const resetAll = () => {
    setStep(STEPS.SUPPLIER);
    setSupplier(null);
    setReceived("");
    setSelectedIssues([]);
    setExpiry(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Receiving" />

      <main className="flex-1 px-4 py-5 overflow-y-auto pb-8">

        {/* SUPPLIER STEP */}
        {step === STEPS.SUPPLIER && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Select Supplier</p>
            {SUPPLIERS.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSupplier(s); setStep(STEPS.SCAN); }}
                className="w-full bg-card border border-border rounded-2xl px-5 py-4 flex items-center justify-between active:bg-secondary transition-all active:scale-[0.99]"
              >
                <div className="text-left">
                  <p className="font-semibold text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.ref}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* SCAN STEP */}
        {step === STEPS.SCAN && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Supplier</span>
              <span className="text-sm font-semibold text-foreground">{supplier?.name}</span>
            </div>
            <ScanPlaceholder onSimulate={() => setStep(STEPS.QUANTITY)} />
          </div>
        )}

        {/* QUANTITY STEP */}
        {step === STEPS.QUANTITY && (
          <div className="space-y-5">
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="text-xs text-muted-foreground font-mono">{MOCK_PRODUCT.sku}</p>
              <h2 className="text-base font-bold text-foreground mt-1">{MOCK_PRODUCT.name}</h2>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expected Qty</span>
                <span className="text-2xl font-bold text-foreground">{MOCK_PRODUCT.expectedQty}</span>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border px-5 py-4">
              <p className="text-xs text-muted-foreground mb-3">Received Qty</p>
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => adjustQty(-1)}
                  className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center active:bg-border active:scale-95 transition-all"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className={`text-4xl font-bold flex-1 text-center ${received ? "text-foreground" : "text-muted-foreground/40"}`}>
                  {received || "0"}
                </span>
                <button
                  onClick={() => adjustQty(1)}
                  className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center active:bg-border active:scale-95 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <NumericKeypad value={received} onChange={setReceived} />

            <button
              onClick={() => setStep(STEPS.ISSUES)}
              disabled={!received}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              Next
            </button>
          </div>
        )}

        {/* ISSUES STEP */}
        {step === STEPS.ISSUES && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Any Issues?</p>
            <p className="text-sm text-muted-foreground -mt-2">Select all that apply, or skip</p>

            <div className="space-y-2">
              {ISSUES.map((issue) => {
                const active = selectedIssues.includes(issue);
                return (
                  <button
                    key={issue}
                    onClick={() => toggleIssue(issue)}
                    className={`w-full py-4 px-5 rounded-2xl border text-sm font-semibold text-left transition-all active:scale-[0.99]
                      ${active
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : "bg-card border-border text-foreground"
                      }`}
                  >
                    {issue}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setStep(STEPS.EXPIRY)}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all"
            >
              {selectedIssues.length > 0 ? "Continue" : "Skip — No Issues"}
            </button>
          </div>
        )}

        {/* EXPIRY STEP */}
        {step === STEPS.EXPIRY && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Expiry Date</p>
            <p className="text-sm text-muted-foreground -mt-2">Select approximate shelf life</p>

            <div className="grid grid-cols-2 gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setExpiry(opt)}
                  className={`py-4 rounded-2xl border text-sm font-semibold transition-all active:scale-[0.99]
                    ${expiry === opt
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-card border-border text-foreground"
                    }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(STEPS.CONFIRM)}
              disabled={!expiry}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              Review
            </button>
          </div>
        )}

        {/* CONFIRM STEP */}
        {step === STEPS.CONFIRM && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Review & Submit</p>

            <div className="bg-card rounded-2xl border border-border divide-y divide-border">
              <Row label="Supplier" value={supplier?.name} />
              <Row label="Product" value={MOCK_PRODUCT.name} />
              <Row label="Expected" value={MOCK_PRODUCT.expectedQty} />
              <Row label="Received" value={received} />
              {selectedIssues.length > 0 && <Row label="Issues" value={selectedIssues.join(", ")} highlight />}
              <Row label="Expiry" value={expiry} />
            </div>

            <button
              onClick={() => setStep(STEPS.DONE)}
              className="w-full py-4 rounded-2xl bg-accent text-accent-foreground font-bold text-sm active:scale-[0.98] transition-all"
            >
              Confirm Receipt
            </button>
          </div>
        )}

        {/* DONE STEP */}
        {step === STEPS.DONE && (
          <div className="flex flex-col items-center justify-center py-16 space-y-5">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">Receipt Confirmed</p>
              <p className="text-sm text-muted-foreground mt-1">{supplier?.name}</p>
            </div>
            <button
              onClick={resetAll}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all"
            >
              Receive Another Item
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

function Row({ label, value, highlight = false }) {
  return (
    <div className="flex items-start justify-between px-5 py-3.5 gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm font-semibold text-right ${highlight ? "text-destructive" : "text-foreground"}`}>{value}</span>
    </div>
  );
}