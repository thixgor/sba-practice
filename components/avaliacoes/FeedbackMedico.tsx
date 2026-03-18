"use client";

import { motion } from "framer-motion";

interface FeedbackMedicoProps {
  correta: boolean;
}

/**
 * Medical-themed feedback animation shown after answering.
 * Correct: green heartbeat line + checkmark pulse
 * Incorrect: red flatline + X
 */
export function FeedbackMedico({ correta }: FeedbackMedicoProps) {
  const color = correta ? "#10B981" : "#EF4444";

  // SVG path for heartbeat PQRST waveform
  const heartbeatPath = correta
    ? "M 0,50 L 30,50 35,50 40,45 45,50 55,50 60,30 65,70 70,20 75,60 80,50 90,50 95,50 100,45 105,50 115,50 120,30 125,70 130,20 135,60 140,50 160,50 200,50"
    : "M 0,50 L 200,50"; // flatline for incorrect

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col items-center gap-3 py-3"
    >
      {/* ECG Line */}
      <div className="w-full max-w-xs h-12 relative overflow-hidden">
        <svg
          viewBox="0 0 200 100"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <motion.path
            d={heartbeatPath}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0.6 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </svg>
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(ellipse at center, ${color}15 0%, transparent 70%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0.3] }}
          transition={{ duration: 0.8 }}
        />
      </div>

      {/* Status icon + text */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 15 }}
      >
        {correta ? (
          <>
            <motion.div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-sba-success/20"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(16, 185, 129, 0.4)",
                  "0 0 0 12px rgba(16, 185, 129, 0)",
                  "0 0 0 0 rgba(16, 185, 129, 0)",
                ],
              }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <svg className="h-5 w-5 text-sba-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <motion.path
                  d="M20 6L9 17l-5-5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                />
              </svg>
            </motion.div>
            <span className="text-sm font-semibold text-sba-success">Resposta Correta</span>
          </>
        ) : (
          <>
            <motion.div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-sba-error/20"
              animate={{
                x: [0, -3, 3, -3, 3, 0],
              }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <svg className="h-5 w-5 text-sba-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <motion.path d="M18 6L6 18" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.2 }} />
                <motion.path d="M6 6l12 12" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.2 }} />
              </svg>
            </motion.div>
            <span className="text-sm font-semibold text-sba-error">Resposta Incorreta</span>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
