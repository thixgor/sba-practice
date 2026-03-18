"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Stethoscope,
  HeartPulse,
  Timer,
  Award,
} from "lucide-react";
import { BreathingCard } from "@/components/animations/BreathingCard";

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color: string;
}

interface StatsGridProps {
  stats?: {
    provasRealizadas: number;
    taxaAcerto: number;
    tempoMedio: string;
    medalhas: number;
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  const items: StatItem[] = [
    {
      label: "Provas Realizadas",
      value: stats?.provasRealizadas ?? 0,
      icon: <Stethoscope className="h-5 w-5" />,
      color: "text-sba-cyan",
    },
    {
      label: "Taxa de Acerto",
      value: `${stats?.taxaAcerto ?? 0}%`,
      icon: <HeartPulse className="h-5 w-5" />,
      color: "text-sba-success",
    },
    {
      label: "Tempo Medio",
      value: stats?.tempoMedio ?? "0min",
      icon: <Timer className="h-5 w-5" />,
      color: "text-sba-warning",
    },
    {
      label: "Medalhas",
      value: stats?.medalhas ?? 0,
      icon: <Award className="h-5 w-5" />,
      color: "text-sba-orange",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <BreathingCard key={item.label} delay={i * 0.8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-md hover:shadow-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="text-2xl font-bold tracking-tight">{item.value}</p>
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl bg-current/10",
                    item.color
                  )}
                >
                  <span className={item.color}>{item.icon}</span>
                </div>
              </div>
              {item.trend && (
                <p
                  className={cn(
                    "mt-2 text-xs font-medium",
                    item.trend.positive
                      ? "text-sba-success"
                      : "text-sba-error"
                  )}
                >
                  {item.trend.positive ? "+" : ""}
                  {item.trend.value}% em relação ao mês anterior
                </p>
              )}
            </CardContent>
            {/* Decorative gradient line */}
            <div
              className={cn(
                "absolute bottom-0 left-0 h-0.5 w-full opacity-60",
                i === 0 && "bg-gradient-to-r from-sba-cyan to-sba-cyan/0",
                i === 1 && "bg-gradient-to-r from-sba-success to-sba-success/0",
                i === 2 && "bg-gradient-to-r from-sba-warning to-sba-warning/0",
                i === 3 && "bg-gradient-to-r from-sba-orange to-sba-orange/0"
              )}
            />
          </Card>
          </motion.div>
        </BreathingCard>
      ))}
    </div>
  );
}
