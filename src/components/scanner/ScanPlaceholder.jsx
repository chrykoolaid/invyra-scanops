import React from "react";
import { motion } from "framer-motion";
import { ScanLine } from "lucide-react";

export default function ScanPlaceholder({ onSimulate, label = "Align barcode within frame" }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative bg-foreground/5 rounded-2xl border-2 border-dashed border-border overflow-hidden flex items-center justify-center" style={{ height: 260 }}>
        <div className="relative w-48 h-48">
          <div className="absolute top-0 left-0 w-7 h-7 border-primary rounded-tl-lg" style={{ borderTopWidth: 3, borderLeftWidth: 3 }} />
          <div className="absolute top-0 right-0 w-7 h-7 border-primary rounded-tr-lg" style={{ borderTopWidth: 3, borderRightWidth: 3 }} />
          <div className="absolute bottom-0 left-0 w-7 h-7 border-primary rounded-bl-lg" style={{ borderBottomWidth: 3, borderLeftWidth: 3 }} />
          <div className="absolute bottom-0 right-0 w-7 h-7 border-primary rounded-br-lg" style={{ borderBottomWidth: 3, borderRightWidth: 3 }} />
          <motion.div
            className="absolute left-2 right-2 h-0.5 bg-primary rounded-full"
            animate={{ top: ["10%", "90%", "10%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <ScanLine className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">{label}</p>
      <button
        onClick={onSimulate}
        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all"
      >
        Simulate Scan
      </button>
    </div>
  );
}