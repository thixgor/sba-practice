"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { ProtectedVideoPlayer } from "./ProtectedVideoPlayer";
import { FeedbackMedico } from "./FeedbackMedico";

interface Alternativa {
  letra: string;
  texto: string;
}

interface QuestaoMultiplaEscolhaProps {
  numero: number;
  total: number;
  enunciado: string;
  alternativas: Alternativa[];
  onResponder: (letra: string) => void;
  feedbackImediato?: boolean;
  gabarito?: string;
  respostaComentada?: string;
  fonteBibliografica?: string;
  disabled?: boolean;
  imagemUrl?: string;
  videoUrl?: string;
}

export function QuestaoMultiplaEscolha({
  numero,
  total,
  enunciado,
  alternativas,
  onResponder,
  feedbackImediato = false,
  gabarito,
  respostaComentada,
  fonteBibliografica,
  disabled = false,
  imagemUrl,
  videoUrl,
}: QuestaoMultiplaEscolhaProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSelect = (letra: string) => {
    if (submitted || disabled) return;
    setSelected(letra);
  };

  const handleSubmit = () => {
    if (!selected || submitted) return;
    setSubmitted(true);
    if (feedbackImediato && gabarito) {
      setShowFeedback(true);
    }
    onResponder(selected);
  };

  const isCorrect = (letra: string) => gabarito === letra;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Question header */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs font-semibold">
          Questão {numero} de {total}
        </Badge>
        <span className="text-xs text-muted-foreground">Múltipla Escolha</span>
      </div>

      {/* Enunciado */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-5 space-y-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{enunciado}</p>
          {imagemUrl && (
            <div className="rounded-lg overflow-hidden border border-border/30">
              <img
                src={imagemUrl}
                alt="Imagem da questão"
                className="w-full max-h-96 object-contain bg-muted/30"
                loading="lazy"
              />
            </div>
          )}
          {videoUrl && (
            <ProtectedVideoPlayer url={videoUrl} />
          )}
        </CardContent>
      </Card>

      {/* Alternativas */}
      <div className="space-y-2.5">
        {alternativas.map((alt) => {
          const isSelected = selected === alt.letra;
          const isGabarito = showFeedback && isCorrect(alt.letra);
          const isWrong = showFeedback && isSelected && !isCorrect(alt.letra);

          return (
            <motion.button
              key={alt.letra}
              onClick={() => handleSelect(alt.letra)}
              disabled={submitted || disabled}
              className={cn(
                "w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                "hover:border-primary/30 hover:bg-primary/5",
                isSelected && !showFeedback && "border-primary bg-primary/5 ring-1 ring-primary/20",
                isGabarito && "border-sba-success bg-sba-success/5 ring-1 ring-sba-success/20 animate-correct-pulse",
                isWrong && "border-sba-error bg-sba-error/5 ring-1 ring-sba-error/20 animate-shake",
                !isSelected && !isGabarito && "border-border/50 bg-card/50",
                (submitted || disabled) && "cursor-default"
              )}
              whileHover={!submitted && !disabled ? { scale: 1.005 } : {}}
              whileTap={!submitted && !disabled ? { scale: 0.995 } : {}}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  isSelected && !showFeedback && "bg-primary text-primary-foreground",
                  isGabarito && "bg-sba-success text-white",
                  isWrong && "bg-sba-error text-white",
                  !isSelected && !isGabarito && !isWrong && "bg-muted text-muted-foreground"
                )}
              >
                {alt.letra}
              </span>
              <span className="text-sm leading-relaxed pt-1 flex-1">
                {alt.texto}
              </span>
              {isGabarito && <CheckCircle2 className="h-5 w-5 text-sba-success shrink-0 mt-1" />}
              {isWrong && <XCircle className="h-5 w-5 text-sba-error shrink-0 mt-1" />}
            </motion.button>
          );
        })}
      </div>

      {/* Medical feedback animation */}
      <AnimatePresence>
        {showFeedback && selected && gabarito && (
          <FeedbackMedico correta={selected === gabarito} />
        )}
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence>
        {showFeedback && (respostaComentada || fonteBibliografica) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-2">
                {respostaComentada && (
                  <div>
                    <p className="text-xs font-semibold text-primary mb-1">Comentário:</p>
                    <p className="text-sm text-foreground/80">{respostaComentada}</p>
                  </div>
                )}
                {fonteBibliografica && (
                  <p className="text-[11px] text-muted-foreground italic">
                    Fonte: {fonteBibliografica}
                  </p>
                )}
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
            Confirmar Resposta
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}
