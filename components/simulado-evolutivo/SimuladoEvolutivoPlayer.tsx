"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PacienteCard } from "./PacienteCard";
import { QuestaoEvolutiva } from "./QuestaoEvolutiva";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SinaisVitais {
  frequenciaCardiaca: number;
  pressaoArterial: string;
  saturacaoOxigenio: number;
  frequenciaRespiratoria: number;
  temperatura: number;
}

interface ECGParams {
  ondaP: { amplitude: number; duracao: number };
  complexoQRS: { amplitude: number; duracao: number };
  ondaT: { amplitude: number; duracao: number };
  segmentoST: { desvio: number };
  status: string;
}

interface PacienteInicial {
  nome: string;
  idade: number;
  sexo: string;
  queixa: string;
  historico: string;
  medicacoes: string;
  sinaisVitais: SinaisVitais;
  ecg: ECGParams;
  statusPaciente: string;
}

interface EstadoPaciente {
  sinaisVitais: SinaisVitais;
  ecg: ECGParams;
  statusPaciente: string;
  historico: { texto: string; timestamp: string }[];
}

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

interface QuestaoEvolutivaData {
  _id: string;
  tipo: string;
  enunciado: string;
  questaoIdRef: string;
  contextoClinico?: { atualizacao: string } | null;
  isFinal: boolean;
  alternativasEvolutivas: AlternativaEvolutiva[];
  imagemUrl?: string | null;
  videoUrl?: string | null;
  ordem: number;
  pontuacao: number;
}

interface TentativaData {
  _id: string;
  protocolId: string;
  avaliacaoId: string;
  iniciadaEm: string;
  status: string;
  pontuacaoTotal: number;
  currentQuestionIndex: number;
  tempoLimiteMinutos?: number | null;
  feedbackImediato?: boolean;
  estadoPaciente?: EstadoPaciente | null;
}

interface FeedbackData {
  tipo: string;
  valor: number;
  correta: boolean;
  retroalimentacao: string;
  proximaQuestao: string | null;
  isFinal: boolean;
  estadoPaciente: EstadoPaciente;
  alternativasReveladas: AlternativaRevelada[];
}

interface SimuladoEvolutivoPlayerProps {
  tentativa: TentativaData;
  questoes: QuestaoEvolutivaData[];
  pacienteInicial: PacienteInicial;
  avaliacaoId: string;
  onFinished: (resultado: Record<string, unknown>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SimuladoEvolutivoPlayer({
  tentativa,
  questoes,
  pacienteInicial,
  avaliacaoId,
  onFinished,
}: SimuladoEvolutivoPlayerProps) {
  // Find the first question (lowest ordem or first in array)
  const firstQuestion = useMemo(
    () => questoes.reduce((min, q) => (q.ordem < min.ordem ? q : min), questoes[0]),
    [questoes],
  );

  const [currentQuestaoIdRef, setCurrentQuestaoIdRef] = useState(
    firstQuestion?.questaoIdRef || "",
  );
  const [estadoPaciente, setEstadoPaciente] = useState<EstadoPaciente>(
    tentativa.estadoPaciente || {
      sinaisVitais: { ...pacienteInicial.sinaisVitais },
      ecg: { ...pacienteInicial.ecg },
      statusPaciente: pacienteInicial.statusPaciente,
      historico: [],
    },
  );
  const [answeredCount, setAnsweredCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Ref for scrolling question into view on mobile
  const questaoRef = useRef<HTMLDivElement>(null);

  // Lookup current question by questaoIdRef
  const currentQuestion = useMemo(
    () => questoes.find((q) => q.questaoIdRef === currentQuestaoIdRef),
    [questoes, currentQuestaoIdRef],
  );

  // Progress
  const progressPercent = questoes.length > 0 ? Math.round((answeredCount / questoes.length) * 100) : 0;

  // Auto-scroll question into view on question change (mobile only)
  useEffect(() => {
    if (questaoRef.current && window.innerWidth < 1024) {
      questaoRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentQuestaoIdRef]);

  // Handle answering a question
  const handleResponder = useCallback(
    async (alternativaId: string) => {
      if (!currentQuestion || isSubmitting) return;
      setIsSubmitting(true);

      try {
        const res = await fetch(`/api/avaliacoes/${avaliacaoId}/responder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            questaoId: currentQuestion._id,
            alternativaEvolutivaId: alternativaId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 409 && errData.error === "ALREADY_ANSWERED") {
            // Question was already answered (stale state) — silently skip
            setIsSubmitting(false);
            return;
          }
          console.error("Error submitting answer:", errData);
          setIsSubmitting(false);
          return;
        }

        const data = await res.json();
        setAnsweredCount((c) => c + 1);

        // Update patient state from server
        if (data.estadoPaciente) {
          setEstadoPaciente(data.estadoPaciente);
        }

        // Set feedback
        setFeedback({
          tipo: data.tipo,
          valor: data.valor,
          correta: data.correta,
          retroalimentacao: data.retroalimentacao || "",
          proximaQuestao: data.proximaQuestao || null,
          isFinal: data.isFinal || false,
          estadoPaciente: data.estadoPaciente,
          alternativasReveladas: data.alternativasReveladas || [],
        });

        // Check if this is the final question
        if (data.isFinal || !data.proximaQuestao) {
          setIsFinished(true);
        }
      } catch (err) {
        console.error("Network error:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentQuestion, avaliacaoId, isSubmitting],
  );

  // Advance to next question
  const handleNext = useCallback(() => {
    if (!feedback) return;

    if (isFinished || feedback.isFinal || !feedback.proximaQuestao) {
      // Finalize
      handleFinalizar();
      return;
    }

    setCurrentQuestaoIdRef(feedback.proximaQuestao);
    setFeedback(null);
  }, [feedback, isFinished]);

  // Finalize the attempt
  const handleFinalizar = useCallback(async () => {
    setIsFinalizing(true);
    try {
      const res = await fetch(`/api/avaliacoes/${avaliacaoId}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Error finalizing");
        setIsFinalizing(false);
        return;
      }

      const data = await res.json();
      onFinished(data);
    } catch (err) {
      console.error("Error finalizing:", err);
      setIsFinalizing(false);
    }
  }, [avaliacaoId, onFinished]);

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Nenhuma questão encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-5">
            Simulado Evolutivo
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {answeredCount} respondidas
          </span>
        </div>
        {tentativa.tempoLimiteMinutos && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{tentativa.tempoLimiteMinutos} min</span>
          </div>
        )}
      </div>

      <Progress value={progressPercent} className="h-1" />

      {/* ── Side-by-side layout (lg+) / stacked (mobile) ── */}
      <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-4 lg:items-start space-y-3 lg:space-y-0">
        {/* Left column: Patient card — sticky on desktop */}
        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:scrollbar-thin">
          <PacienteCard
            nome={pacienteInicial.nome}
            idade={pacienteInicial.idade}
            sexo={pacienteInicial.sexo}
            queixa={pacienteInicial.queixa}
            historico={pacienteInicial.historico}
            medicacoes={pacienteInicial.medicacoes}
            sinaisVitais={estadoPaciente.sinaisVitais}
            ecg={estadoPaciente.ecg}
            statusPaciente={estadoPaciente.statusPaciente}
            defaultCollapsed
          />
        </div>

        {/* Right column: Question area */}
        <div ref={questaoRef} className="space-y-3 min-w-0">
          <AnimatePresence mode="wait">
            <QuestaoEvolutiva
              key={currentQuestaoIdRef}
              questaoIdRef={currentQuestion.questaoIdRef}
              enunciado={currentQuestion.enunciado}
              contextoClinico={currentQuestion.contextoClinico}
              alternativas={currentQuestion.alternativasEvolutivas}
              imagemUrl={currentQuestion.imagemUrl}
              videoUrl={currentQuestion.videoUrl}
              onResponder={handleResponder}
              disabled={isSubmitting}
              feedback={feedback ? {
                tipo: feedback.tipo,
                valor: feedback.valor,
                correta: feedback.correta,
                retroalimentacao: feedback.retroalimentacao,
                alternativasReveladas: feedback.alternativasReveladas,
              } : null}
            />
          </AnimatePresence>

          {/* Loading state */}
          {isSubmitting && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Processando decisão...</span>
            </div>
          )}

          {/* Next / Finish button (after feedback) */}
          <AnimatePresence>
            {feedback && !isSubmitting && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center"
              >
                <Button
                  onClick={handleNext}
                  disabled={isFinalizing}
                  size="lg"
                  className={cn(
                    "shadow-md",
                    isFinished || feedback.isFinal || !feedback.proximaQuestao
                      ? "bg-sba-success hover:bg-sba-success/90 shadow-sba-success/20"
                      : "bg-primary hover:bg-primary/90 shadow-primary/20"
                  )}
                >
                  {isFinalizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : isFinished || feedback.isFinal || !feedback.proximaQuestao ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Ver Resultado Final
                    </>
                  ) : (
                    "Próxima Questão →"
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
