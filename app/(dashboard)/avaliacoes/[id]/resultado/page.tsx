"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { ResultadoFinal } from "@/components/avaliacoes/ResultadoFinal";
import { ResultadoEvolutivo } from "@/components/simulado-evolutivo/ResultadoEvolutivo";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { generateReportPDF } from "@/lib/pdf/generateReport";
import { loadSBALogo } from "@/lib/pdf/sbaLogo";

interface DetalheResposta {
  questaoNumero: number;
  enunciado: string;
  alternativaSelecionada?: string;
  gabarito?: string;
  correta: boolean;
  respostaComentada?: string;
  fonteBibliografica?: string;
}

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

interface ResultadoData {
  tentativa: {
    _id: string;
    protocolId: string;
    pontuacaoObtida: number;
    pontuacaoTotal: number;
    percentualAcerto: number;
    duracaoSegundos: number;
    finalizadaEm: string;
  };
  avaliacao: {
    _id: string;
    name: string;
    tipo: string;
    cursoName?: string | null;
    configuracao: {
      feedbackFinal?: boolean;
      dataLiberacaoGabarito?: string | null;
    };
  };
  detalhes: DetalheResposta[];
  // Evolutivo-specific
  detalhesEvolutivo?: DetalheEvolutivo[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pacienteInicial?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  estadoFinal?: any;
}

export default function ResultadoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [data, setData] = useState<ResultadoData | null>(null);
  const [loading, setLoading] = useState(true);
  const logoRef = useRef<string | null>(null);

  // Pre-load the SBA logo for PDF generation
  useEffect(() => {
    loadSBALogo().then((url) => { logoRef.current = url; }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!params.id) return;

    const tentativaId = searchParams.get("tentativaId");
    const queryStr = tentativaId ? `?tentativaId=${tentativaId}` : "";

    fetch(`/api/avaliacoes/${params.id}/resultado${queryStr}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Resultado nao encontrado");
        return r.json();
      })
      .then((res) => {
        const isEvolutivo = res.avaliacao?.tipo === "simulado-evolutivo";

        if (isEvolutivo) {
          // Map evolutivo detalhes
          setData({
            tentativa: res.tentativa,
            avaliacao: res.avaliacao,
            detalhes: [], // empty for standard (not used)
            detalhesEvolutivo: (res.detalhes || []).map((d: Record<string, unknown>, i: number) => ({
              questaoNumero: (d.questaoNumero as number) || i + 1,
              questaoIdRef: (d.questaoIdRef as string) || "",
              enunciado: (d.enunciado as string) || "",
              alternativaTexto: (d.alternativaTexto as string) || null,
              tipoResposta: (d.tipoResposta as string) || null,
              valorObtido: (d.valorObtido as number) ?? 0,
              maxValor: (d.maxValor as number) || 100,
              correta: (d.correta as boolean) ?? false,
              retroalimentacao: (d.retroalimentacao as string) || null,
              alternativasEvolutivas: (d.alternativasEvolutivas as Array<{ id: string; texto: string; tipo: string; valor: number }>) || [],
            })),
            pacienteInicial: res.pacienteInicial || null,
            estadoFinal: res.estadoFinal || null,
          });
        } else {
          setData({
            tentativa: res.tentativa,
            avaliacao: res.avaliacao,
            detalhes: (res.detalhes || []).map((d: Record<string, unknown>) => ({
              questaoNumero: (d.questaoNumero as number) || 0,
              enunciado: (d.enunciado as string) || "",
              alternativaSelecionada: (d.alternativaSelecionada as string) || undefined,
              gabarito: (d.gabarito as string) || undefined,
              correta: (d.correta as boolean) ?? false,
              respostaComentada: (d.respostaComentada as string) || undefined,
              fonteBibliografica: (d.fonteBibliografica as string) || undefined,
            })),
          });
        }
      })
      .catch(() => toast.error("Erro ao carregar resultado"))
      .finally(() => setLoading(false));
  }, [params.id, searchParams]);

  const gabaritoLiberado =
    data?.avaliacao.configuracao.feedbackFinal !== false &&
    (!data?.avaliacao.configuracao.dataLiberacaoGabarito ||
      new Date(data.avaliacao.configuracao.dataLiberacaoGabarito) <= new Date());

  const handleDownloadPDF = useCallback(async () => {
    if (!data || !user) return;

    try {
      if (!logoRef.current) {
        try { logoRef.current = await loadSBALogo(); } catch { /* ok */ }
      }

      const doc = generateReportPDF({
        protocolId: data.tentativa.protocolId,
        userName: user.name || "Aluno",
        crm: user.crm || undefined,
        avaliacaoName: data.avaliacao.name,
        tipo: data.avaliacao.tipo,
        cursoName: data.avaliacao.cursoName || undefined,
        pontuacaoObtida: data.tentativa.pontuacaoObtida,
        pontuacaoTotal: data.tentativa.pontuacaoTotal,
        percentualAcerto: data.tentativa.percentualAcerto,
        duracaoSegundos: data.tentativa.duracaoSegundos,
        dataRealizacao: new Date(data.tentativa.finalizadaEm),
        respostas: data.avaliacao.tipo === "simulado-evolutivo"
          ? (data.detalhesEvolutivo || []).map((d) => ({
              questaoNumero: d.questaoNumero,
              enunciado: d.enunciado,
              alternativaSelecionada: d.alternativaTexto || undefined,
              gabarito: `${d.tipoResposta || ""} (${d.valorObtido}/${d.maxValor})`,
              correta: d.correta,
              respostaComentada: d.retroalimentacao || undefined,
            }))
          : data.detalhes.map((d) => ({
              questaoNumero: d.questaoNumero,
              enunciado: d.enunciado,
              alternativaSelecionada: d.alternativaSelecionada || undefined,
              gabarito: d.gabarito || undefined,
              correta: d.correta,
              respostaComentada: d.respostaComentada || undefined,
              fonteBibliografica: d.fonteBibliografica || undefined,
            })),
        gabaritoLiberado,
        logoDataUrl: logoRef.current || undefined,
      });

      doc.save(`Resultado_${data.tentativa.protocolId}.pdf`);
      toast.success("PDF baixado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF");
    }
  }, [data, user, gabaritoLiberado]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-20 rounded-xl skeleton-sba" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl skeleton-sba" />
          ))}
        </div>
        <Skeleton className="h-60 rounded-xl skeleton-sba" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Resultado nao disponivel.</p>
      </div>
    );
  }

  // Simulado Evolutivo result
  if (data.avaliacao.tipo === "simulado-evolutivo" && data.detalhesEvolutivo) {
    return (
      <div className="max-w-3xl mx-auto">
        <ResultadoEvolutivo
          avaliacaoName={data.avaliacao.name}
          pontuacaoObtida={data.tentativa.pontuacaoObtida}
          pontuacaoTotal={data.tentativa.pontuacaoTotal}
          percentualAcerto={data.tentativa.percentualAcerto}
          duracaoSegundos={data.tentativa.duracaoSegundos}
          protocolId={data.tentativa.protocolId}
          detalhes={data.detalhesEvolutivo}
          pacienteInicial={data.pacienteInicial}
          estadoFinal={data.estadoFinal}
          onDownloadPDF={handleDownloadPDF}
        />
      </div>
    );
  }

  // Standard result
  return (
    <div className="max-w-3xl mx-auto">
      <ResultadoFinal
        avaliacaoName={data.avaliacao.name}
        tipo={data.avaliacao.tipo}
        pontuacaoObtida={data.tentativa.pontuacaoObtida}
        pontuacaoTotal={data.tentativa.pontuacaoTotal}
        percentualAcerto={data.tentativa.percentualAcerto}
        duracaoSegundos={data.tentativa.duracaoSegundos}
        respostas={data.detalhes}
        protocolId={data.tentativa.protocolId}
        gabaritoLiberado={gabaritoLiberado}
        onDownloadPDF={handleDownloadPDF}
      />
    </div>
  );
}
