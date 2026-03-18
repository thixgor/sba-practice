"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface RelatorioPDFProps {
  protocolId: string;
  userName: string;
  crm?: string;
  avaliacaoName: string;
  tipo: string;
  cursoName?: string;
  pontuacaoObtida: number;
  pontuacaoTotal: number;
  percentualAcerto: number;
  duracaoSegundos: number;
  dataRealizacao: Date;
  respostas: Array<{
    questaoNumero: number;
    enunciado: string;
    alternativaSelecionada?: string;
    gabarito?: string;
    correta: boolean;
  }>;
  gabaritoLiberado: boolean;
}

export function RelatorioPDF(props: RelatorioPDFProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      // Dynamic import to reduce bundle size
      const { generateReportPDF } = await import("@/lib/pdf/generateReport");
      const doc = generateReportPDF(props);
      doc.save(`SBA-Relatorio-${props.protocolId}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setGenerating(false);
    }
  }, [props]);

  return (
    <Button
      onClick={handleGenerate}
      disabled={generating}
      className="bg-primary hover:bg-primary/90"
    >
      {generating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-2 h-4 w-4" />
      )}
      {generating ? "Gerando PDF..." : "Baixar PDF"}
    </Button>
  );
}
