"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Clock,
  ChevronRight,
  Video,
  FileText,
  BarChart,
  HeartPulse,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AvaliacaoCardProps {
  id: string;
  name: string;
  description: string;
  tipo: "pre-teste" | "pos-teste" | "prova" | "simulacao" | "prova-video" | "simulado-evolutivo";
  questoesCount: number;
  tempoLimite?: number | null;
  status?: "pendente" | "realizada" | "em-andamento";
  percentualAcerto?: number;
  index?: number;
}

const tipoConfig: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  "pre-teste": {
    label: "Pré-Teste",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: FileText,
  },
  "pos-teste": {
    label: "Pós-Teste",
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
    icon: BarChart,
  },
  prova: {
    label: "Prova",
    color: "bg-primary/10 text-primary",
    icon: ClipboardList,
  },
  simulacao: {
    label: "Simulação",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    icon: ClipboardList,
  },
  "prova-video": {
    label: "Prova de Vídeo",
    color: "bg-sba-orange/10 text-sba-orange",
    icon: Video,
  },
  "simulado-evolutivo": {
    label: "Simulado Evolutivo",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    icon: HeartPulse,
  },
};

export function AvaliacaoCard({
  id,
  name,
  description,
  tipo,
  questoesCount,
  tempoLimite,
  status = "pendente",
  percentualAcerto,
  index = 0,
}: AvaliacaoCardProps) {
  const config = tipoConfig[tipo] || tipoConfig["prova"];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -2 }}
    >
      <Link
        href={
          status === "realizada"
            ? `/avaliacoes/${id}/resultado`
            : `/avaliacoes/${id}/realizar`
        }
      >
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer h-full">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    config.color
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {name}
                  </h3>
                  <Badge
                    variant="secondary"
                    className={cn("mt-1 text-[10px] font-semibold", config.color)}
                  >
                    {config.label}
                  </Badge>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">
              {description}
            </p>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{questoesCount} questões</span>
              {tempoLimite && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{tempoLimite}min</span>
                </div>
              )}
            </div>

            {/* Status badge */}
            {status === "realizada" && percentualAcerto !== undefined && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] font-semibold",
                    percentualAcerto >= 70
                      ? "bg-sba-success/10 text-sba-success"
                      : "bg-sba-error/10 text-sba-error"
                  )}
                >
                  {percentualAcerto}% de acerto
                </Badge>
              </div>
            )}
            {status === "em-andamento" && (
              <Badge
                variant="secondary"
                className="bg-sba-warning/10 text-sba-warning text-[10px] font-semibold"
              >
                Em andamento
              </Badge>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
