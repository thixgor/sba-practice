"use client";

import { motion } from "framer-motion";

interface ECGWaveProps {
  className?: string;
  color?: string;
  width?: number;
  height?: number;
}

export function ECGWave({
  className = "",
  color = "#01B2BB",
  width = 300,
  height = 60,
}: ECGWaveProps) {
  // ECG-like path with characteristic PQRST complex
  const ecgPath = `M0,${height / 2}
    L${width * 0.06},${height / 2}
    Q${width * 0.08},${height / 2} ${width * 0.1},${height * 0.42}
    Q${width * 0.12},${height * 0.35} ${width * 0.14},${height / 2}
    L${width * 0.18},${height / 2}
    L${width * 0.2},${height * 0.48}
    L${width * 0.22},${height * 0.1}
    L${width * 0.25},${height * 0.85}
    L${width * 0.28},${height * 0.35}
    L${width * 0.3},${height / 2}
    L${width * 0.36},${height / 2}
    Q${width * 0.38},${height / 2} ${width * 0.4},${height * 0.38}
    Q${width * 0.44},${height * 0.28} ${width * 0.48},${height / 2}
    L${width * 0.54},${height / 2}
    L${width * 0.56},${height / 2}
    Q${width * 0.58},${height / 2} ${width * 0.6},${height * 0.42}
    Q${width * 0.62},${height * 0.35} ${width * 0.64},${height / 2}
    L${width * 0.68},${height / 2}
    L${width * 0.7},${height * 0.48}
    L${width * 0.72},${height * 0.1}
    L${width * 0.75},${height * 0.85}
    L${width * 0.78},${height * 0.35}
    L${width * 0.8},${height / 2}
    L${width * 0.86},${height / 2}
    Q${width * 0.88},${height / 2} ${width * 0.9},${height * 0.38}
    Q${width * 0.94},${height * 0.28} ${width * 0.98},${height / 2}
    L${width},${height / 2}`;

  return (
    <div className={`overflow-hidden ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background line */}
        <path
          d={ecgPath}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.15"
        />
        {/* Animated tracing line */}
        <motion.path
          d={ecgPath}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0.8 }}
          animate={{ pathLength: 1, opacity: [0.8, 1, 0.8] }}
          transition={{
            pathLength: { duration: 3, repeat: Infinity, ease: "linear" },
            opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          }}
        />
        {/* Glow effect */}
        <motion.path
          d={ecgPath}
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.15"
          filter="blur(3px)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </svg>
    </div>
  );
}
