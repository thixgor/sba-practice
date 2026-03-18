"use client";

import { motion } from "framer-motion";

interface BreathingCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function BreathingCard({
  children,
  delay = 0,
  className = "",
}: BreathingCardProps) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.004, 1],
        opacity: [1, 0.98, 1],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
