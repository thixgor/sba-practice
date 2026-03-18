"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart, AlertTriangle } from "lucide-react";

interface StatusPacienteProps {
  status: string;
  className?: string;
}

export function StatusPaciente({ status, className = "" }: StatusPacienteProps) {
  const isEstavel = status === "Estável";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
          isEstavel
            ? "bg-sba-success/10 text-sba-success border border-sba-success/30"
            : "bg-sba-error/10 text-sba-error border border-sba-error/30"
        } ${className}`}
      >
        {isEstavel ? (
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Heart className="h-3.5 w-3.5 fill-current" />
          </motion.div>
        ) : (
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
          </motion.div>
        )}
        {status}
      </motion.div>
    </AnimatePresence>
  );
}
