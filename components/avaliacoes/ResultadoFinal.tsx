"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PatientMonitorGauge } from "@/components/animations/PatientMonitorGauge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileDown,
  ArrowLeft,
  Trophy,
  BookOpen,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface ResultadoFinalProps {
  avaliacaoName: string;
  tipo: string;
  pontuacaoObtida: number;
  pontuacaoTotal: number;
  percentualAcerto: number;
  duracaoSegundos: number;
  respostas: Array<{
    questaoNumero: number;
    enunciado: string;
    alternativaSelecionada?: string;
    gabarito?: string;
    correta: boolean;
    respostaComentada?: string;
    fonteBibliografica?: string;
  }>;
  protocolId: string;
  gabaritoLiberado: boolean;
  onDownloadPDF?: () => void;
}

function RespostaDetalhe({
  resposta: r,
}: {
  resposta: {
    questaoNumero: number;
    enunciado: string;
    alternativaSelecionada?: string;
    gabarito?: string;
    correta: boolean;
    respostaComentada?: string;
    fonteBibliografica?: string;
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const hasCommentary = !!(r.respostaComentada || r.fonteBibliografica);

  return (
    <div>
      <button
        type="button"
        onClick={() => hasCommentary && setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-3 px-5 py-3 text-sm text-left transition-colors",
          r.correta ? "bg-sba-success/5" : "bg-sba-error/5",
          hasCommentary && "hover:bg-muted/30 cursor-pointer"
        )}
      >
        <span className="font-mono text-xs text-muted-foreground w-8 shrink-0">
          Q{r.questaoNumero}
        </span>
        <span className="flex-1 truncate text-xs">{r.enunciado}</span>
        <span className="text-xs font-medium shrink-0">
          {r.alternativaSelecionada || "\u2014"}
        </span>
        {r.gabarito && (
          <span className="text-xs text-muted-foreground shrink-0">
            ({r.gabarito})
          </span>
        )}
        {r.correta ? (
          <CheckCircle2 className="h-4 w-4 text-sba-success shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-sba-error shrink-0" />
        )}
        {hasCommentary && (
          expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )
        )}
      </button>
      {expanded && hasCommentary && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="px-5 pb-3 border-l-4 border-l-primary/30 bg-primary/5"
        >
          {r.respostaComentada && (
            <div className="pt-3">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Resposta Comentada</span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {r.respostaComentada}
              </p>
            </div>
          )}
          {r.fonteBibliografica && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30">
              <BookOpen className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground italic">
                {r.fonteBibliografica}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export function ResultadoFinal({
  avaliacaoName,
  tipo,
  pontuacaoObtida,
  pontuacaoTotal,
  percentualAcerto,
  duracaoSegundos,
  respostas,
  protocolId,
  gabaritoLiberado,
  onDownloadPDF,
}: ResultadoFinalProps) {
  const minutes = Math.floor(duracaoSegundos / 60);
  const seconds = duracaoSegundos % 60;
  const isApproved = percentualAcerto >= 70;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="mb-4"
        >
          <Trophy
            className={cn(
              "mx-auto h-16 w-16",
              isApproved ? "text-sba-success" : "text-sba-warning"
            )}
          />
        </motion.div>
        <h1 className="text-2xl font-bold">
          {isApproved ? "Parabéns!" : "Avaliação Concluída"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{avaliacaoName}</p>
        <Badge variant="secondary" className="mt-2 text-xs">
          {tipo} &middot; Protocolo: {protocolId}
        </Badge>
      </motion.div>

      {/* Score + Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="sm:col-span-1 flex justify-center"
        >
          <PatientMonitorGauge
            value={percentualAcerto}
            label="Acerto"
            size={160}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="sm:col-span-2 grid gap-3 sm:grid-cols-2"
        >
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-sba-success" />
              <div>
                <p className="text-2xl font-bold">{pontuacaoObtida}/{pontuacaoTotal}</p>
                <p className="text-xs text-muted-foreground">Questões corretas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {minutes}:{String(seconds).padStart(2, "0")}
                </p>
                <p className="text-xs text-muted-foreground">Tempo total</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed answers */}
      {gabaritoLiberado && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Detalhamento das Respostas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {respostas.map((r, i) => (
                  <RespostaDetalhe key={i} resposta={r} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!gabaritoLiberado && (
        <Card className="border-sba-warning/30 bg-sba-warning/5">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-sba-warning font-medium">
              O gabarito ainda não foi liberado. Aguarde a data de liberação.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/avaliacoes">
          <Button variant="outline" className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar às Avaliações
          </Button>
        </Link>
        {onDownloadPDF && (
          <Button
            onClick={onDownloadPDF}
            className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
        )}
      </div>
    </div>
  );
}
