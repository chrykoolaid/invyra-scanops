import React from "react";
import { useToast } from "@/components/ui/use-toast";

export default function BottomActionBar({ actions }) {
  const { toast } = useToast();

  const handleTap = (action) => {
    if (action.onClick) {
      action.onClick();
    } else {
      toast({
        description: "Coming in later stage",
        duration: 1500,
      });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 pb-safe">
      <div className="flex gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleTap(action)}
            className={`
              flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl
              font-semibold text-xs transition-all duration-150 active:scale-95
              ${action.variant === "primary"
                ? "bg-primary text-primary-foreground active:bg-primary/90"
                : "bg-secondary text-secondary-foreground active:bg-border"
              }
            `}
          >
            <action.icon className="w-5 h-5" strokeWidth={2} />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}