"use client";

import { motion } from "framer-motion";

interface MedicalDripAnimationProps {
  size?: number;
  className?: string;
}

export function MedicalDripAnimation({
  size = 48,
  className = "",
}: MedicalDripAnimationProps) {
  const bagW = size * 0.6;
  const bagH = size * 0.4;
  const tubeX = size / 2;

  return (
    <div className={`inline-flex ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
      >
        {/* IV bag */}
        <rect
          x={(size - bagW) / 2}
          y={2}
          width={bagW}
          height={bagH}
          rx={4}
          className="stroke-primary/40 fill-primary/5"
          strokeWidth="1.5"
        />
        {/* Fluid level */}
        <motion.rect
          x={(size - bagW) / 2 + 2}
          y={4}
          width={bagW - 4}
          rx={2}
          className="fill-primary/15"
          animate={{
            height: [bagH - 6, bagH - 10, bagH - 6],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Tube */}
        <line
          x1={tubeX}
          y1={bagH + 2}
          x2={tubeX}
          y2={size - 4}
          className="stroke-primary/30"
          strokeWidth="1.5"
        />
        {/* Drip */}
        <motion.circle
          cx={tubeX}
          r={2}
          className="fill-primary/60"
          animate={{
            cy: [bagH + 6, size - 6],
            opacity: [1, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeIn",
            repeatDelay: 0.5,
          }}
        />
      </svg>
    </div>
  );
}
