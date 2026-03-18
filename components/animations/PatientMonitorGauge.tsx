"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

interface PatientMonitorGaugeProps {
  value: number; // 0-100
  label?: string;
  size?: number;
  className?: string;
}

export function PatientMonitorGauge({
  value,
  label = "Performance",
  size = 180,
  className = "",
}: PatientMonitorGaugeProps) {
  const [mounted, setMounted] = useState(false);
  const spring = useSpring(0, { stiffness: 40, damping: 15 });
  const displayValue = useTransform(spring, (v) => Math.round(v));
  const [displayNum, setDisplayNum] = useState(0);

  useEffect(() => {
    setMounted(true);
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = displayValue.on("change", (v) => setDisplayNum(v));
    return unsubscribe;
  }, [displayValue]);

  if (!mounted) return null;

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const getColor = (v: number) => {
    if (v >= 80) return "#10B981";
    if (v >= 60) return "#01B2BB";
    if (v >= 40) return "#F59E0B";
    return "#EF4444";
  };

  const color = getColor(value);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        {/* Glow */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          opacity="0.15"
          filter="blur(4px)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {displayNum}%
        </motion.span>
        <span className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
    </div>
  );
}
