"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronRight, Star, AlertCircle, Info } from "lucide-react";
import { ProtectedVideoPlayer } from "@/components/avaliacoes/ProtectedVideoPlayer";

interface AlternativaEvolutiva {
  id: string;
  texto: string;
}

interface AlternativaRevelada {
  id: string;
  texto: string;
  tipo: string;
  valor: number;
}

interface QuestaoEvolutivaProps {
  questaoIdRef: string;
  enunciado: string;
  contextoClinico?: { atualizacao: string } | null;
  alternativas: AlternativaEvolutiva[];
  imagemUrl?: string | null;
  videoUrl?: string | null;
  onResponder: (alternativaId: string) => void;
  disabled?: boolean;
  // Feedback (set after answer)
  feedback?: {
    tipo: string;
    valor: number;
    correta: boolean;
    retroalimentacao: string;
    alternativasReveladas: AlternativaRevelada[];
  } | null;
}

export function QuestaoEvolutiva({
  enunciado,
  contextoClinico,
  alternativas,
  imagemUrl,
  videoUrl,
  onResponder,
  disabled = false,
  feedback,
}: QuestaoEvolutivaProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const showFeedback = !!feedback;

  const handleSelect = (id: string) => {
    if (submitted || disabled) return;
    setSelected(id);
  };

  const handleSubmit = () => {
    if (!selected || submitted) return;
    setSubmitted(true);
    onResponder(selected);
  };

  // Find revealed info for alternatives
  const getRevealed = (id: string): AlternativaRevelada | undefined => {
    return feedback?.alternativasReveladas?.find((a) => a.id === id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Clinical context update */}
      {contextoClinico?.atualizacao && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3"
        >
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/90 leading-relaxed">
            {contextoClinico.atualizacao}
          </p>
        </motion.div>
      )}

      {/* Enunciado */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{enunciado}</p>
          {imagemUrl && (
            <div className="rounded-lg overflow-hidden border border-border/30">
              <img
                src={imagemUrl}
                alt="Imagem da questão"
                className="w-full max-h-72 object-contain bg-muted/30"
                loading="lazy"
              />
            </div>
          )}
          {videoUrl && <ProtectedVideoPlayer url={videoUrl} />}
        </CardContent>
      </Card>

      {/* Alternativas */}
      <div className="space-y-2">
        {alternativas.map((alt, idx) => {
          const isSelected = selected === alt.id;
          const revealed = showFeedback ? getRevealed(alt.id) : null;
          const isMaisCorreto = revealed?.tipo === "Mais Correto";
          const isMenosCorreto = revealed?.tipo === "Menos Correto";
          const isChosenAlt = showFeedback && isSelected;

          return (
            <motion.button
              key={alt.id}
              onClick={() => handleSelect(alt.id)}
              disabled={submitted || disabled}
              className={cn(
                "w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                !showFeedback && "hover:border-primary/30 hover:bg-primary/5",
                isSelected && !showFeedback && "border-primary bg-primary/5 ring-1 ring-primary/20",
                showFeedback && isMaisCorreto && "border-sba-success bg-sba-success/5",
                showFeedback && isMenosCorreto && "border-sba-warning/60 bg-sba-warning/5",
                showFeedback && isChosenAlt && isMaisCorreto && "ring-2 ring-sba-success/30",
                showFeedback && isChosenAlt && isMenosCorreto && "ring-2 ring-sba-warning/30",
                !isSelected && !showFeedback && "border-border/50 bg-card/50",
                (submitted || disabled) && "cursor-default"
              )}
              whileHover={!submitted && !disabled ? { scale: 1.005 } : {}}
              whileTap={!submitted && !disabled ? { scale: 0.995 } : {}}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  isSelected && !showFeedback && "bg-primary text-primary-foreground",
                  showFeedback && isMaisCorreto && "bg-sba-success text-white",
                  showFeedback && isMenosCorreto && "bg-sba-warning text-white",
                  !isSelected && !showFeedback && "bg-muted text-muted-foreground"
                )}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm leading-relaxed">{alt.texto}</span>
                {showFeedback && revealed && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        isMaisCorreto
                          ? "border-sba-success/40 text-sba-success bg-sba-success/10"
                          : "border-sba-warning/40 text-sba-warning bg-sba-warning/10"
                      )}
                    >
                      {isMaisCorreto ? (
                        <Star className="h-2.5 w-2.5 mr-1 fill-current" />
                      ) : (
                        <AlertCircle className="h-2.5 w-2.5 mr-1" />
                      )}
                      {revealed.tipo}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {revealed.valor} pts
                    </span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Feedback card */}
      <AnimatePresence>
        {showFeedback && feedback?.retroalimentacao && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className={cn(
              "border-l-4",
              feedback.correta ? "border-l-sba-success bg-sba-success/5" : "border-l-sba-warning bg-sba-warning/5"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    className={cn(
                      "text-xs",
                      feedback.correta ? "bg-sba-success" : "bg-sba-warning"
                    )}
                  >
                    {feedback.tipo} — {feedback.valor} pts
                  </Badge>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {feedback.retroalimentacao}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      {!submitted && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!selected || disabled}
            className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
          >
            Confirmar Decisão
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}
