"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";

interface OximetriaDisplayProps {
  spo2: number;
  frequenciaCardiaca: number;
  className?: string;
}

function getSpO2Color(spo2: number): { text: string; bar: string; glow: string } {
  if (spo2 >= 95) return { text: "text-sba-success", bar: "#10B981", glow: "shadow-sba-success/30" };
  if (spo2 >= 90) return { text: "text-sba-warning", bar: "#F59E0B", glow: "shadow-sba-warning/30" };
  return { text: "text-sba-error", bar: "#EF4444", glow: "shadow-sba-error/30" };
}

export function OximetriaDisplay({
  spo2,
  frequenciaCardiaca,
  className = "",
}: OximetriaDisplayProps) {
  const colors = getSpO2Color(spo2);
  // Pulse animation speed based on heart rate
  const pulseDuration = Math.max(0.4, 60 / Math.max(frequenciaCardiaca, 40));

  return (
    <div className={`rounded-lg border border-border/30 bg-black/90 p-3 ${className}`}>
      <div className="flex items-center justify-between">
        {/* SpO2 value */}
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
          >
            <Activity className={`h-5 w-5 ${colors.text}`} />
          </motion.div>
          <div className="leading-none">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/50">
              SpO₂
            </span>
            <div className="flex items-baseline gap-1">
              <motion.span
                key={spo2}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-2xl font-bold tabular-nums ${colors.text}`}
              >
                {spo2}
              </motion.span>
              <span className="text-xs text-white/40">%</span>
            </div>
          </div>
        </div>

        {/* Pulse wave SVG */}
        <div className="flex-1 max-w-[120px] ml-4 overflow-hidden">
          <svg
            width="120"
            height="30"
            viewBox="0 0 120 30"
            fill="none"
            className="w-full"
          >
            <motion.path
              d="M0,20 Q5,20 10,18 Q15,15 18,10 Q20,6 22,8 Q25,12 28,20 Q30,22 35,20 L40,20 Q45,20 50,18 Q55,15 58,10 Q60,6 62,8 Q65,12 68,20 Q70,22 75,20 L80,20 Q85,20 90,18 Q95,15 98,10 Q100,6 102,8 Q105,12 108,20 Q110,22 115,20 L120,20"
              stroke={colors.bar}
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0.7 }}
              animate={{ pathLength: 1, opacity: [0.7, 1, 0.7] }}
              transition={{
                pathLength: { duration: pulseDuration * 3, repeat: Infinity, ease: "linear" },
                opacity: { duration: pulseDuration * 3, repeat: Infinity, ease: "easeInOut" },
              }}
            />
          </svg>
        </div>

        {/* FC */}
        <div className="leading-none text-right">
          <span className="text-[9px] font-mono uppercase tracking-widest text-white/50">
            FC
          </span>
          <motion.p
            key={frequenciaCardiaca}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-bold tabular-nums text-red-400"
          >
            {Math.round(frequenciaCardiaca)}{" "}
            <span className="text-[9px] font-normal text-white/40">bpm</span>
          </motion.p>
        </div>
      </div>
    </div>
  );
}
