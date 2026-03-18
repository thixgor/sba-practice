"use client";

import { motion } from "framer-motion";
import { Heart, Activity } from "lucide-react";

interface VitalSignsBarProps {
  heartRate?: number;
  spO2?: number;
  className?: string;
}

export function VitalSignsBar({
  heartRate = 72,
  spO2 = 98,
  className = "",
}: VitalSignsBarProps) {
  return (
    <div
      className={`flex items-center gap-6 rounded-lg border border-border/50 bg-card/60 backdrop-blur-sm px-4 py-2.5 ${className}`}
    >
      {/* Heart Rate */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Heart className="h-4 w-4 text-red-400 fill-red-400" />
        </motion.div>
        <div className="leading-none">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            FC
          </span>
          <p className="text-sm font-bold tabular-nums text-foreground">
            {heartRate}{" "}
            <span className="text-[10px] font-normal text-muted-foreground">
              bpm
            </span>
          </p>
        </div>
      </div>

      {/* Mini ECG trace */}
      <div className="flex-1 overflow-hidden">
        <svg
          width="100%"
          height="24"
          viewBox="0 0 200 24"
          preserveAspectRatio="none"
          className="opacity-40"
        >
          <motion.path
            d="M0,12 L30,12 L35,12 L40,10 L45,2 L50,20 L55,8 L60,12 L90,12 L95,12 L100,10 L105,2 L110,20 L115,8 L120,12 L150,12 L155,12 L160,10 L165,2 L170,20 L175,8 L180,12 L200,12"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            className="text-primary"
            initial={{ pathLength: 0, opacity: 0.6 }}
            animate={{ pathLength: 1, opacity: [0.6, 1, 0.6] }}
            transition={{
              pathLength: { duration: 2.5, repeat: Infinity, ease: "linear" },
              opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        </svg>
      </div>

      {/* SpO2 */}
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <div className="leading-none">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            SpO2
          </span>
          <p className="text-sm font-bold tabular-nums text-foreground">
            {spO2}
            <span className="text-[10px] font-normal text-muted-foreground">
              %
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
