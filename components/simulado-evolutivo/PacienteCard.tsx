"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, ChevronDown, ChevronUp, Pill, FileText, Stethoscope } from "lucide-react";
import { MonitorSinaisVitais } from "./MonitorSinaisVitais";
import { StatusPaciente } from "./StatusPaciente";
import { ECGMonitor } from "./ECGMonitor";

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

interface PacienteCardProps {
  nome: string;
  idade: number;
  sexo: string;
  queixa: string;
  historico: string;
  medicacoes: string;
  sinaisVitais: SinaisVitais;
  ecg?: ECGParams;
  statusPaciente: string;
  className?: string;
  /** Start collapsed — only header + vitals strip shown */
  defaultCollapsed?: boolean;
}

export function PacienteCard({
  nome,
  idade,
  sexo,
  queixa,
  historico,
  medicacoes,
  sinaisVitais,
  ecg,
  statusPaciente,
  className = "",
  defaultCollapsed = false,
}: PacienteCardProps) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  return (
    <Card className={`border-border/50 bg-card/90 backdrop-blur-sm ${className}`}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold leading-tight">{nome}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                  {idade} anos
                </Badge>
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                  {sexo}
                </Badge>
              </div>
            </div>
          </div>
          <StatusPaciente status={statusPaciente} />
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 space-y-2">
        {/* Sinais Vitais — always visible */}
        <MonitorSinaisVitais sinaisVitais={sinaisVitais} />

        {/* Expandable: queixa, ECG, historico, medicacoes */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-[11px] text-muted-foreground h-6"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Ocultar detalhes" : "Ver detalhes do paciente"}
          {expanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
        </Button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2.5 overflow-hidden"
            >
              {/* Queixa */}
              <div className="flex items-start gap-2">
                <Stethoscope className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Queixa</p>
                  <p className="text-xs text-foreground/90 leading-snug">{queixa}</p>
                </div>
              </div>

              {/* ECG Monitor */}
              {ecg && (
                <ECGMonitor
                  ecg={ecg}
                  frequenciaCardiaca={sinaisVitais.frequenciaCardiaca}
                  compact
                />
              )}

              {historico && (
                <div className="flex items-start gap-2">
                  <FileText className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Histórico</p>
                    <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-snug">{historico}</p>
                  </div>
                </div>
              )}

              {medicacoes && (
                <div className="flex items-start gap-2">
                  <Pill className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Medicações</p>
                    <p className="text-xs text-foreground/80 leading-snug">{medicacoes}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
