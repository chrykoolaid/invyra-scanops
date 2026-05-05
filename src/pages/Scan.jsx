import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/scanner/PageHeader";
import { ScanLine, Flashlight, Keyboard } from "lucide-react";
import { motion } from "framer-motion";

export default function Scan() {
  const navigate = useNavigate();
  const [isScanning] = useState(true);

  const handleSimulateScan = () => {
    navigate("/product/demo");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Scanning..." subtitle="Product Lookup" />

      <main className="flex-1 flex flex-col px-4 py-5">
        {/* Scanner Area */}
        <div className="relative flex-1 min-h-[320px] max-h-[480px] bg-foreground/5 rounded-2xl border-2 border-dashed border-border overflow-hidden flex items-center justify-center">
          {/* Simulated scanning frame */}
          <div className="relative w-56 h-56">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-primary rounded-tl-lg" style={{ borderWidth: '3px' }} />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-primary rounded-tr-lg" style={{ borderWidth: '3px' }} />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-primary rounded-bl-lg" style={{ borderWidth: '3px' }} />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-primary rounded-br-lg" style={{ borderWidth: '3px' }} />
            
            {/* Animated scan line */}
            {isScanning && (
              <motion.div
                className="absolute left-2 right-2 h-0.5 bg-primary rounded-full shadow-lg shadow-primary/30"
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>

          {/* Icon overlay */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <ScanLine className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>

        {/* Instruction */}
        <p className="text-center text-sm text-muted-foreground mt-4 mb-6">
          Align barcode within frame
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 mb-4">
          <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-95 active:bg-border transition-all">
            <Flashlight className="w-4 h-4" />
            Torch
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-95 active:bg-border transition-all">
            <Keyboard className="w-4 h-4" />
            Manual
          </button>
        </div>

        {/* Demo simulate button */}
        <button
          onClick={handleSimulateScan}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all"
        >
          Simulate Scan
        </button>
      </main>
    </div>
  );
}