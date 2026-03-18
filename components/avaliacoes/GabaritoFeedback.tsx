"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface GabaritoFeedbackProps {
  correta: boolean;
  gabaritoLetra: string;
  respostaComentada?: string;
  fonteBibliografica?: string;
}

export function GabaritoFeedback({
  correta,
  gabaritoLetra,
  respostaComentada,
  fonteBibliografica,
}: GabaritoFeedbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "border-l-4",
          correta
            ? "border-l-sba-success bg-sba-success/5"
            : "border-l-sba-error bg-sba-error/5"
        )}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            {correta ? (
              <CheckCircle2 className="h-5 w-5 text-sba-success" />
            ) : (
              <XCircle className="h-5 w-5 text-sba-error" />
            )}
            <span
              className={cn(
                "text-sm font-semibold",
                correta ? "text-sba-success" : "text-sba-error"
              )}
            >
              {correta ? "Resposta Correta!" : `Resposta Incorreta — Gabarito: ${gabaritoLetra}`}
            </span>
          </div>

          {respostaComentada && (
            <p className="text-sm text-foreground/80 leading-relaxed">
              {respostaComentada}
            </p>
          )}

          {fonteBibliografica && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              <span className="italic">{fonteBibliografica}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
