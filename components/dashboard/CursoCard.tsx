"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";

interface CursoCardProps {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  duracao?: number;
  avaliacoesTotal: number;
  avaliacoesConcluidas: number;
  index?: number;
}

export function CursoCard({
  id,
  name,
  description,
  imageUrl,
  duracao,
  avaliacoesTotal,
  avaliacoesConcluidas,
  index = 0,
}: CursoCardProps) {
  const progress =
    avaliacoesTotal > 0
      ? Math.round((avaliacoesConcluidas / avaliacoesTotal) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -2 }}
    >
      <Link href={`/cursos/${id}`}>
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer h-full">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

          {/* Course image */}
          <div className="h-32 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpen className="h-8 w-8 text-primary/30" />
            )}
          </div>

          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                  {name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                <span>{avaliacoesTotal} avaliações</span>
              </div>
              {duracao && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{duracao}h</span>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {progress === 100 && (
              <Badge
                variant="secondary"
                className="bg-sba-success/10 text-sba-success text-[10px] font-semibold"
              >
                Concluído
              </Badge>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
