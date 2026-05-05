import React from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export default function ActionTile({ icon: Icon, label, to, active = false }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTap = () => {
    if (active && to) {
      navigate(to);
    } else {
      toast({
        description: "Coming in later stage",
        duration: 1500,
      });
    }
  };

  return (
    <button
      onClick={handleTap}
      className={`
        group flex h-[132px] min-h-[132px] w-full flex-col items-center justify-start rounded-2xl border px-3 pb-3 pt-5
        text-center transition-all duration-150 active:scale-[0.98]
        ${active
          ? "bg-card border-border shadow-sm active:bg-secondary focus-visible:ring-2 focus-visible:ring-primary/35"
          : "bg-secondary/50 border-transparent opacity-60"
        }
      `}
    >
      <span
        className={`
          flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
          ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
        `}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>

      <span
        className={`
          mt-3 flex h-9 w-full max-w-[88px] items-center justify-center text-center text-[12px] font-semibold leading-[1.12]
          ${active ? "text-foreground" : "text-muted-foreground"}
        `}
      >
        {label}
      </span>
    </button>
  );
}
