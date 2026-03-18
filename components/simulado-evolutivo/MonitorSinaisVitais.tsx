"use client";

import { motion } from "framer-motion";
import { Heart, Wind, Thermometer, Activity, Droplets } from "lucide-react";

interface SinaisVitais {
  frequenciaCardiaca: number;
  pressaoArterial: string;
  saturacaoOxigenio: number;
  frequenciaRespiratoria: number;
  temperatura: number;
}

interface MonitorSinaisVitaisProps {
  sinaisVitais: SinaisVitais;
  className?: string;
}

function getVitalColor(type: string, value: number): string {
  switch (type) {
    case "fc":
      if (value < 60 || value > 100) return value < 50 || value > 120 ? "text-sba-error" : "text-sba-warning";
      return "text-sba-success";
    case "spo2":
      if (value < 90) return "text-sba-error";
      if (value < 95) return "text-sba-warning";
      return "text-sba-success";
    case "fr":
      if (value < 12 || value > 20) return value < 8 || value > 30 ? "text-sba-error" : "text-sba-warning";
      return "text-sba-success";
    case "temp":
      if (value < 35 || value > 38.5) return value < 34 || value > 39.5 ? "text-sba-error" : "text-sba-warning";
      return "text-sba-success";
    default:
      return "text-foreground";
  }
}

function getVitalBgColor(type: string, value: number): string {
  switch (type) {
    case "fc":
      if (value < 60 || value > 100) return value < 50 || value > 120 ? "bg-sba-error/10" : "bg-sba-warning/10";
      return "bg-sba-success/10";
    case "spo2":
      if (value < 90) return "bg-sba-error/10";
      if (value < 95) return "bg-sba-warning/10";
      return "bg-sba-success/10";
    case "fr":
      if (value < 12 || value > 20) return value < 8 || value > 30 ? "bg-sba-error/10" : "bg-sba-warning/10";
      return "bg-sba-success/10";
    case "temp":
      if (value < 35 || value > 38.5) return value < 34 || value > 39.5 ? "bg-sba-error/10" : "bg-sba-warning/10";
      return "bg-sba-success/10";
    default:
      return "bg-muted/50";
  }
}

export function MonitorSinaisVitais({ sinaisVitais, className = "" }: MonitorSinaisVitaisProps) {
  const vitals = [
    {
      label: "FC",
      value: sinaisVitais.frequenciaCardiaca,
      unit: "bpm",
      type: "fc",
      icon: Heart,
      animate: true,
    },
    {
      label: "PA",
      value: sinaisVitais.pressaoArterial,
      unit: "mmHg",
      type: "pa",
      icon: Droplets,
      animate: false,
    },
    {
      label: "SpO₂",
      value: sinaisVitais.saturacaoOxigenio,
      unit: "%",
      type: "spo2",
      icon: Activity,
      animate: false,
    },
    {
      label: "FR",
      value: sinaisVitais.frequenciaRespiratoria,
      unit: "irpm",
      type: "fr",
      icon: Wind,
      animate: false,
    },
    {
      label: "Temp",
      value: sinaisVitais.temperatura,
      unit: "°C",
      type: "temp",
      icon: Thermometer,
      animate: false,
    },
  ];

  return (
    <div className={`grid grid-cols-5 gap-2 ${className}`}>
      {vitals.map((vital) => {
        const numValue = typeof vital.value === "number" ? vital.value : 0;
        const colorClass = vital.type === "pa" ? "text-foreground" : getVitalColor(vital.type, numValue);
        const bgClass = vital.type === "pa" ? "bg-muted/50" : getVitalBgColor(vital.type, numValue);
        const Icon = vital.icon;

        return (
          <motion.div
            key={vital.label}
            className={`flex flex-col items-center rounded-lg border border-border/30 p-2 ${bgClass}`}
            layout
          >
            <div className="flex items-center gap-1 mb-1">
              {vital.animate ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  <Icon className={`h-3 w-3 ${colorClass}`} />
                </motion.div>
              ) : (
                <Icon className={`h-3 w-3 ${colorClass}`} />
              )}
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                {vital.label}
              </span>
            </div>
            <motion.span
              key={String(vital.value)}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-base font-bold tabular-nums leading-none ${colorClass}`}
            >
              {typeof vital.value === "number" ? vital.value.toFixed(vital.type === "temp" ? 1 : 0) : vital.value}
            </motion.span>
            <span className="text-[8px] text-muted-foreground mt-0.5">{vital.unit}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
