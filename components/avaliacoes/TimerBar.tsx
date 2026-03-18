"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface TimerBarProps {
  totalSeconds: number;
  onTimeUp: () => void;
  paused?: boolean;
}

export function TimerBar({ totalSeconds, onTimeUp, paused = false }: TimerBarProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const timeUpCalledRef = useRef(false);

  // Countdown interval — only decrements state, never calls parent callbacks
  useEffect(() => {
    if (paused || remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [paused, remaining]);

  // Fire onTimeUp in a separate effect so it doesn't run during another
  // component's render (fixes "Cannot update while rendering" error)
  useEffect(() => {
    if (remaining <= 0 && !timeUpCalledRef.current) {
      timeUpCalledRef.current = true;
      onTimeUp();
    }
  }, [remaining, onTimeUp]);

  const percentage = (remaining / totalSeconds) * 100;
  const isLow = percentage < 20;
  const isCritical = percentage < 10;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50 py-3 px-4 -mx-4 md:-mx-6 lg:-mx-8">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-fit">
          <Clock className={cn("h-4 w-4", isLow ? "text-sba-error" : "text-muted-foreground")} />
          <span
            className={cn(
              "text-sm font-mono font-bold tabular-nums",
              isCritical && "text-sba-error animate-pulse-sba",
              isLow && !isCritical && "text-sba-warning",
              !isLow && "text-foreground"
            )}
          >
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        </div>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full transition-colors duration-500",
              isCritical ? "bg-sba-error" : isLow ? "bg-sba-warning" : "bg-primary"
            )}
            initial={{ width: "100%" }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
}
