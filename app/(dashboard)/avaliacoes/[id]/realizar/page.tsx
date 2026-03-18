"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuestaoMultiplaEscolha } from "@/components/avaliacoes/QuestaoMultiplaEscolha";
import { QuestaoDiscursiva } from "@/components/avaliacoes/QuestaoDiscursiva";
import { TimerBar } from "@/components/avaliacoes/TimerBar";
import { SimuladoEvolutivoPlayer } from "@/components/simulado-evolutivo/SimuladoEvolutivoPlayer";
import { ProvaVideo } from "@/components/avaliacoes/ProvaVideo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Play,
  ClipboardList,
  Clock,
  AlertTriangle,
  Loader2,
  BookOpen,
  Stethoscope,
  Video,
} from "lucide-react";

interface Questao {
  _id: string;
  tipo: "multipla" | "discursiva";
  enunciado: string;
  alternativas: Array<{ letra: string; texto: string }>;
  gabarito?: string;
  respostaComentada?: string;
  fonteBibliografica?: string;
  imagemUrl?: string;
  videoUrl?: string;
}

interface AvaliacaoData {
  _id: string;
  name: string;
  description: string;
  tipo: string;
  curso?: { _id: string; name: string } | null;
  questoes: Questao[];
  configuracao: {
    tempoLimiteMinutos?: number | null;
    feedbackImediato: boolean;
    tentativasPermitidas: number;
  };
  // Prova de Vídeo fields
  legendaVideo?: string | null;
  modoFinalizacao?: string | null;
}

interface TentativaData {
  _id: string;
  currentQuestionIndex: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

type PageState = "loading" | "intro" | "exam" | "finishing";

export default function RealizarAvaliacaoPage() {
  const params = useParams();
  const router = useRouter();
  const [avaliacao, setAvaliacao] = useState<AvaliacaoData | null>(null);
  const [tentativa, setTentativa] = useState<TentativaData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [submitting, setSubmitting] = useState(false);
  // Simulado evolutivo state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [evolutivoQuestoes, setEvolutivoQuestoes] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pacienteInicial, setPacienteInicial] = useState<any>(null);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/avaliacoes/${params.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const av = data.avaliacao || data;
        // Ensure questoes is always an array
        if (!av.questoes) av.questoes = [];
        if (!av.configuracao) av.configuracao = {};
        setAvaliacao(av);
        setPageState("intro");
      })
      .catch(() => {
        toast.error("Erro ao carregar avaliação");
        setPageState("intro");
      });
  }, [params.id]);

  const handleStart = async () => {
    if (!avaliacao) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/avaliacoes/${avaliacao._id}/iniciar`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao iniciar avaliação");
      }
      const data = await res.json();
      setTentativa(data.tentativa || data);

      // For simulado-evolutivo: capture pacienteInicial and evolutivo questoes
      if (avaliacao?.tipo === "simulado-evolutivo") {
        setPacienteInicial(data.pacienteInicial);
        setEvolutivoQuestoes(data.questoes || []);
      } else if (data.questoes && avaliacao) {
        // The iniciar endpoint returns questoes separately — update avaliacao with them
        setAvaliacao({ ...avaliacao, questoes: data.questoes });
      }
      setCurrentIndex(data.tentativa?.currentQuestionIndex || 0);
      setPageState("exam");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResponder = async (resposta: string) => {
    if (!tentativa || !avaliacao) return;
    try {
      const questao = avaliacao.questoes[currentIndex];
      await fetch(`/api/avaliacoes/${avaliacao._id}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tentativaId: tentativa._id,
          questaoId: questao._id,
          alternativaSelecionada: questao.tipo === "multipla" ? resposta : undefined,
          respostaDiscursiva: questao.tipo === "discursiva" ? resposta : undefined,
        }),
        credentials: "include",
      });

      // Move to next question or finalize
      if (currentIndex < avaliacao.questoes.length - 1) {
        setTimeout(() => setCurrentIndex((prev) => prev + 1), avaliacao.configuracao.feedbackImediato ? 800 : 300);
      } else {
        await handleFinalize();
      }
    } catch {
      toast.error("Erro ao salvar resposta");
    }
  };

  const handleFinalize = useCallback(async () => {
    if (!tentativa || !avaliacao) return;
    setPageState("finishing");
    try {
      const res = await fetch(`/api/avaliacoes/${avaliacao._id}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tentativaId: tentativa._id }),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const tid = data.resultado?.tentativaId || tentativa._id;
        toast.success("Avaliação finalizada!");
        router.push(`/avaliacoes/${avaliacao._id}/resultado?tentativaId=${tid}`);
      } else {
        toast.error("Erro ao finalizar");
        setPageState("exam");
      }
    } catch {
      toast.error("Erro ao finalizar");
      setPageState("exam");
    }
  }, [tentativa, avaliacao, router]);

  const handleTimeUp = useCallback(() => {
    toast.warning("Tempo esgotado!");
    handleFinalize();
  }, [handleFinalize]);

  if (pageState === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 skeleton-sba" />
        <Skeleton className="h-48 rounded-xl skeleton-sba" />
      </div>
    );
  }

  const isEvolutivo = avaliacao?.tipo === "simulado-evolutivo";
  const isProvaVideo = avaliacao?.tipo === "prova-video";

  // Intro screen
  if (pageState === "intro" && avaliacao) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              {isEvolutivo ? (
                <Stethoscope className="h-7 w-7 text-primary" />
              ) : isProvaVideo ? (
                <Video className="h-7 w-7 text-primary" />
              ) : (
                <ClipboardList className="h-7 w-7 text-primary" />
              )}
            </div>
            <CardTitle className="text-xl">{avaliacao.name}</CardTitle>
            <Badge variant="secondary" className="mx-auto mt-2 text-xs">
              {avaliacao.tipo === "simulado-evolutivo" ? "Simulado Evolutivo" : avaliacao.tipo === "prova-video" ? "Prova de Vídeo" : avaliacao.tipo}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-center text-muted-foreground">
              {avaliacao.description}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <ClipboardList className="mx-auto h-5 w-5 text-primary mb-1" />
                <p className="text-lg font-bold">{avaliacao.questoes.length}</p>
                <p className="text-[11px] text-muted-foreground">Questões</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <Clock className="mx-auto h-5 w-5 text-primary mb-1" />
                <p className="text-lg font-bold">
                  {avaliacao.configuracao.tempoLimiteMinutos || "Sem"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {avaliacao.configuracao.tempoLimiteMinutos ? "Minutos" : "Limite"}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-sba-warning/5 border border-sba-warning/20 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-sba-warning shrink-0 mt-0.5" />
              <div className="text-xs text-foreground/80">
                <p className="font-medium text-sba-warning">Atenção</p>
                <p className="mt-0.5">
                  {isEvolutivo
                    ? "Neste simulado evolutivo, cada decisão altera o estado do paciente. Suas escolhas determinam o caminho do caso clínico. Não há como voltar atrás após confirmar uma decisão."
                    : isProvaVideo
                    ? "O vídeo será reproduzido e pausará automaticamente nos momentos configurados para exibir questões. Você terá um tempo limitado para responder cada questão. Não é possível avançar ou retroceder o vídeo."
                    : "Após iniciar, seu progresso será salvo automaticamente. Cada resposta será registrada no servidor."}
                  {avaliacao.configuracao.tempoLimiteMinutos &&
                    ` Você tem ${avaliacao.configuracao.tempoLimiteMinutos} minutos para completar.`}
                </p>
              </div>
            </div>

            <Button
              onClick={handleStart}
              disabled={submitting}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {submitting ? "Iniciando..." : "Iniciar Avaliação"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Finishing screen
  if (pageState === "finishing") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Finalizando avaliação...</p>
      </div>
    );
  }

  // Exam screen
  if (pageState === "exam" && avaliacao) {
    // ---- SIMULADO EVOLUTIVO ----
    if (isEvolutivo && tentativa && pacienteInicial && evolutivoQuestoes.length > 0) {
      return (
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Stethoscope className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{avaliacao.name}</p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Simulado Evolutivo
                </Badge>
                {avaliacao.curso?.name && (
                  <span className="flex items-center gap-1 truncate">
                    <BookOpen className="h-3 w-3 shrink-0" />
                    {avaliacao.curso.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {avaliacao.configuracao.tempoLimiteMinutos && (
            <TimerBar
              totalSeconds={avaliacao.configuracao.tempoLimiteMinutos * 60}
              onTimeUp={handleTimeUp}
            />
          )}

          <SimuladoEvolutivoPlayer
            tentativa={tentativa as Parameters<typeof SimuladoEvolutivoPlayer>[0]["tentativa"]}
            questoes={evolutivoQuestoes}
            pacienteInicial={pacienteInicial}
            avaliacaoId={avaliacao._id}
            onFinished={(data) => {
              const tid = data.resultado && typeof data.resultado === "object" && "tentativaId" in data.resultado
                ? (data.resultado as { tentativaId: string }).tentativaId
                : tentativa._id;
              toast.success("Simulado evolutivo finalizado!");
              router.push(`/avaliacoes/${avaliacao._id}/resultado?tentativaId=${tid}`);
            }}
          />
        </div>
      );
    }

    // ---- PROVA DE VÍDEO ----
    if (isProvaVideo && tentativa) {
      return (
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sba-orange/10 shrink-0">
              <Video className="h-4.5 w-4.5 text-sba-orange" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{avaliacao.name}</p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-sba-orange/10 text-sba-orange">
                  Prova de Vídeo
                </Badge>
                {avaliacao.curso?.name && (
                  <span className="flex items-center gap-1 truncate">
                    <BookOpen className="h-3 w-3 shrink-0" />
                    {avaliacao.curso.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <ProvaVideo
            tentativaId={tentativa._id}
            avaliacaoId={avaliacao._id}
            legendaVideo={avaliacao.legendaVideo}
            modoFinalizacao={avaliacao.modoFinalizacao}
            onComplete={() => {
              toast.success("Prova de vídeo finalizada!");
              handleFinalize();
            }}
          />
        </div>
      );
    }

    // ---- STANDARD EXAM ----
    const currentQuestion = avaliacao.questoes[currentIndex];
    if (!currentQuestion) return null;

    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Avaliacao info card */}
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <ClipboardList className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{avaliacao.name}</p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {avaliacao.tipo}
              </Badge>
              {avaliacao.curso?.name && (
                <span className="flex items-center gap-1 truncate">
                  <BookOpen className="h-3 w-3 shrink-0" />
                  {avaliacao.curso.name}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold text-primary">
              {currentIndex + 1}/{avaliacao.questoes.length}
            </p>
            <p className="text-[10px] text-muted-foreground">questoes</p>
          </div>
        </div>

        {avaliacao.configuracao.tempoLimiteMinutos && (
          <TimerBar
            totalSeconds={avaliacao.configuracao.tempoLimiteMinutos * 60}
            onTimeUp={handleTimeUp}
          />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentQuestion.tipo === "multipla" ? (
              <QuestaoMultiplaEscolha
                numero={currentIndex + 1}
                total={avaliacao.questoes.length}
                enunciado={currentQuestion.enunciado}
                alternativas={currentQuestion.alternativas}
                onResponder={handleResponder}
                feedbackImediato={avaliacao.configuracao.feedbackImediato}
                gabarito={avaliacao.configuracao.feedbackImediato ? currentQuestion.gabarito : undefined}
                respostaComentada={currentQuestion.respostaComentada}
                fonteBibliografica={currentQuestion.fonteBibliografica}
                imagemUrl={currentQuestion.imagemUrl}
                videoUrl={currentQuestion.videoUrl}
              />
            ) : (
              <QuestaoDiscursiva
                numero={currentIndex + 1}
                total={avaliacao.questoes.length}
                enunciado={currentQuestion.enunciado}
                onResponder={handleResponder}
                imagemUrl={currentQuestion.imagemUrl}
                videoUrl={currentQuestion.videoUrl}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return null;
}
