"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, ChevronRight, Lock } from "lucide-react";
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
  locked?: boolean;
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
  locked = false,
}: CursoCardProps) {
  const progress =
    avaliacoesTotal > 0
      ? Math.round((avaliacoesConcluidas / avaliacoesTotal) * 100)
      : 0;

  const content = (
    <Card className={`group relative overflow-hidden border-border/50 backdrop-blur-sm transition-all h-full ${
      locked
        ? "bg-muted/40 opacity-75 cursor-default"
        : "bg-card/80 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
    }`}>
      {/* Top accent bar */}
      <div className={`h-1 ${locked ? "bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10" : "bg-gradient-to-r from-primary via-primary/80 to-primary/40"}`} />

      {/* Course image */}
      <div className={`h-32 flex items-center justify-center overflow-hidden relative ${
        locked ? "bg-muted/50" : "bg-gradient-to-br from-primary/5 to-primary/10"
      }`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className={`w-full h-full object-cover ${locked ? "grayscale opacity-50" : ""}`}
          />
        ) : (
          <BookOpen className={`h-8 w-8 ${locked ? "text-muted-foreground/20" : "text-primary/30"}`} />
        )}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="flex flex-col items-center gap-1.5">
              <div className="rounded-full bg-muted-foreground/10 p-2.5 backdrop-blur-sm border border-muted-foreground/20">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm line-clamp-1 transition-colors ${
              locked ? "text-muted-foreground" : "group-hover:text-primary"
            }`}>
              {name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          </div>
          {locked ? (
            <Lock className="h-4 w-4 text-muted-foreground/50 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          )}
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

        {locked ? (
          <Badge
            variant="secondary"
            className="bg-muted-foreground/10 text-muted-foreground text-[10px] font-medium gap-1"
          >
            <Lock className="h-2.5 w-2.5" />
            Acesso restrito
          </Badge>
        ) : (
          <>
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
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={locked ? undefined : { y: -2 }}
    >
      {locked ? (
        <div>{content}</div>
      ) : (
        <Link href={`/cursos/${id}`}>{content}</Link>
      )}
    </motion.div>
  );
}
