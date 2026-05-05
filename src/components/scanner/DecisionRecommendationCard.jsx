import React from "react";
import { CheckCircle2, Info, Route, ShieldAlert, Sparkles, XCircle } from "lucide-react";

const BUTTON_BASE = "w-full py-3.5 rounded-2xl text-sm font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40";

function tone(decision) {
  if (decision?.riskLevel === "Review" || decision?.riskLevel === "High") return { shell: "bg-amber-500/10 border-amber-500/20", icon: "bg-amber-500/10 text-amber-700", label: "text-amber-800" };
  if (decision?.riskLevel === "Medium") return { shell: "bg-primary/5 border-primary/20", icon: "bg-primary/10 text-primary", label: "text-primary" };
  return { shell: "bg-accent/5 border-accent/20", icon: "bg-accent/10 text-accent", label: "text-accent" };
}

export default function DecisionRecommendationCard({ decision, onAccept, onReject, onMoreInfo, acceptLabel = "Accept", rejectLabel = "Reject" }) {
  if (!decision) return null;
  const styles = tone(decision);
  return (
    <section className={`${styles.shell} rounded-2xl border p-5 min-w-0 overflow-hidden`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className={`${styles.icon} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>{decision.supervisorReviewRequired ? <ShieldAlert className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}</div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold uppercase tracking-wider ${styles.label}`}>Recommendation</p>
          <h3 className="text-lg font-black text-foreground mt-1 break-words">{decision.recommendedAction}</h3>
          <p className="text-sm text-muted-foreground mt-1 break-words">{decision.reasonText}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Fact label="Confidence" value={decision.confidence} />
        <Fact label="Risk" value={decision.riskLevel} />
        <Fact label="Role" value={decision.requiredRole} />
        <Fact label="Next" value={decision.eventToCreate || "No event"} />
      </div>
      <div className="rounded-2xl bg-background/70 border border-border/70 px-4 py-3 mt-4 min-w-0">
        <div className="flex items-start gap-2"><Route className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /><p className="text-xs text-muted-foreground break-words">{decision.nextStepText}</p></div>
      </div>
      {(onAccept || onReject || onMoreInfo) && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          {onAccept && <button onClick={onAccept} className={`${BUTTON_BASE} bg-primary text-primary-foreground`}><CheckCircle2 className="w-4 h-4" />{acceptLabel}</button>}
          {onReject && <button onClick={onReject} className={`${BUTTON_BASE} bg-secondary text-secondary-foreground active:bg-border`}><XCircle className="w-4 h-4" />{rejectLabel}</button>}
          {onMoreInfo && <button onClick={onMoreInfo} className={`${BUTTON_BASE} bg-secondary text-secondary-foreground active:bg-border col-span-2`}><Info className="w-4 h-4" />More Info</button>}
        </div>
      )}
    </section>
  );
}

function Fact({ label, value }) {
  return <div className="rounded-2xl bg-background/70 border border-border/60 px-3 py-3 min-w-0"><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">{label}</p><p className="text-sm font-black text-foreground mt-1 break-words">{value || "—"}</p></div>;
}
