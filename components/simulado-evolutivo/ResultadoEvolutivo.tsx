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
  Stethoscope,
  Star,
  AlertCircle,
  User,
} from "lucide-react";
import Link from "next/link";

interface DetalheEvolutivo {
  questaoNumero: number;
  questaoIdRef: string;
  enunciado: string;
  alternativaTexto?: string | null;
  tipoResposta?: string | null;
  valorObtido: number;
  maxValor: number;
  correta: boolean;
  retroalimentacao?: string | null;
  alternativasEvolutivas: Array<{
    id: string;
    texto: string;
    tipo: string;
    valor: number;
  }>;
}

interface ResultadoEvolutivoProps {
  avaliacaoName: string;
  pontuacaoObtida: number;
  pontuacaoTotal: number;
  percentualAcerto: number;
  duracaoSegundos: number;
  protocolId: string;
  detalhes: DetalheEvolutivo[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pacienteInicial?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  estadoFinal?: any;
  onDownloadPDF?: () => void;
}

export function ResultadoEvolutivo({
  avaliacaoName,
  pontuacaoObtida,
  pontuacaoTotal,
  percentualAcerto,
  duracaoSegundos,
  protocolId,
  detalhes,
  pacienteInicial,
  estadoFinal,
  onDownloadPDF,
}: ResultadoEvolutivoProps) {
  const minutes = Math.floor(duracaoSegundos / 60);
  const seconds = duracaoSegundos % 60;
  const isGoodResult = percentualAcerto >= 70;

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
          <Stethoscope
            className={cn(
              "mx-auto h-16 w-16",
              isGoodResult ? "text-sba-success" : "text-sba-warning"
            )}
          />
        </motion.div>
        <h1 className="text-2xl font-bold">
          {isGoodResult ? "Excelente Conduta!" : "Simulado Concluído"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{avaliacaoName}</p>
        <Badge variant="secondary" className="mt-2 text-xs">
          Simulado Evolutivo &middot; Protocolo: {protocolId}
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
            label="Performance"
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
              <Star className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(pontuacaoObtida)}/{Math.round(pontuacaoTotal)}
                </p>
                <p className="text-xs text-muted-foreground">Pontos obtidos</p>
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

      {/* Patient summary */}
      {pacienteInicial && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Paciente: {pacienteInicial.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>{pacienteInicial.idade} anos, {pacienteInicial.sexo} &mdash; {pacienteInicial.queixa}</p>
              {estadoFinal && (
                <p className="font-medium">
                  Estado final:{" "}
                  <span className={estadoFinal.statusPaciente === "Estável" ? "text-sba-success" : "text-sba-error"}>
                    {estadoFinal.statusPaciente}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Detailed decision breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Evolução das Decisões
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {detalhes.map((d, i) => {
                const isMaisCorreto = d.tipoResposta === "Mais Correto";
                return (
                  <div key={i} className="px-5 py-4 space-y-2">
                    {/* Question header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          Decisão {d.questaoNumero}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            isMaisCorreto
                              ? "border-sba-success/40 text-sba-success"
                              : "border-sba-warning/40 text-sba-warning"
                          )}
                        >
                          {isMaisCorreto ? (
                            <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                          ) : (
                            <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                          )}
                          {d.tipoResposta || "—"}
                        </Badge>
                      </div>
                      <span className="text-xs font-bold tabular-nums">
                        {d.valorObtido}/{d.maxValor} pts
                      </span>
                    </div>

                    {/* Question text */}
                    <p className="text-xs text-foreground/80 line-clamp-2">{d.enunciado}</p>

                    {/* User's answer */}
                    <div className={cn(
                      "rounded-lg px-3 py-2 text-xs",
                      isMaisCorreto ? "bg-sba-success/5 border border-sba-success/20" : "bg-sba-warning/5 border border-sba-warning/20"
                    )}>
                      <p className="font-medium">Sua decisão: {d.alternativaTexto || "—"}</p>
                    </div>

                    {/* Retroalimentacao */}
                    {d.retroalimentacao && (
                      <p className="text-[11px] text-muted-foreground italic pl-3 border-l-2 border-primary/20">
                        {d.retroalimentacao}
                      </p>
                    )}

                    {/* All alternatives */}
                    {d.alternativasEvolutivas.length > 0 && (
                      <div className="space-y-1 mt-1">
                        {d.alternativasEvolutivas.map((alt) => (
                          <div key={alt.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {alt.tipo === "Mais Correto" ? (
                              <CheckCircle2 className="h-3 w-3 text-sba-success shrink-0" />
                            ) : (
                              <XCircle className="h-3 w-3 text-sba-warning shrink-0" />
                            )}
                            <span className="truncate flex-1">{alt.texto}</span>
                            <span className="tabular-nums">{alt.valor}pts</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
