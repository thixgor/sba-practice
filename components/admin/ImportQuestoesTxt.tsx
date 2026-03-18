"use client";

import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  Download,
} from "lucide-react";
import { parseTxt } from "@/lib/import/parseTxt";
import type { ParsedQuestao, ParsedPacienteInicial } from "@/lib/import/types";

interface PreviewItem {
  index: number;
  kind: string;
  tipo?: string;
  enunciado: string;
  alternativas: number;
  gabarito?: string | null;
  questaoIdRef?: string;
  isFinal?: boolean;
}

interface ParseError {
  questaoIndex: number;
  line?: number;
  message: string;
}

/**
 * Props for ImportQuestoesTxt.
 *
 * Two usage modes:
 * 1. API mode (avaliacaoId provided): imports into existing avaliação via API.
 * 2. Local mode (onQuestoesImported provided, no avaliacaoId): parses client-side
 *    and returns parsed questions for the creation form to use.
 */
interface ImportQuestoesTxtProps {
  avaliacaoId?: string;
  avaliacaoTipo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after API import succeeds (API mode) */
  onImportSuccess?: (count: number) => void;
  /** Called with parsed questions (local mode, for creation form) */
  onQuestoesImported?: (questoes: ParsedQuestao[]) => void;
  /** Called with parsed patient data (local mode, simulado-evolutivo) */
  onPacienteImported?: (paciente: ParsedPacienteInicial) => void;
}

type Step = "upload" | "preview" | "result";

export function ImportQuestoesTxt({
  avaliacaoId,
  avaliacaoTipo,
  open,
  onOpenChange,
  onImportSuccess,
  onQuestoesImported,
  onPacienteImported,
}: ImportQuestoesTxtProps) {
  const isLocalMode = !avaliacaoId && !!onQuestoesImported;
  const [step, setStep] = useState<Step>("upload");
  const [txtContent, setTxtContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [parsedQuestoes, setParsedQuestoes] = useState<ParsedQuestao[]>([]);
  const [parsedPaciente, setParsedPaciente] = useState<ParsedPacienteInicial | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setTxtContent("");
    setFileName("");
    setPreview([]);
    setErrors([]);
    setTotalBlocks(0);
    setImportedCount(0);
    setParsedQuestoes([]);
    setParsedPaciente(null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".txt")) {
      toast.error("Selecione um arquivo .txt");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setTxtContent(content);
    };
    reader.readAsText(file, "UTF-8");
  };

  const buildPreview = (questoes: ParsedQuestao[]): PreviewItem[] => {
    return questoes.map((q, i) => {
      if (q.kind === "evolutiva") {
        return {
          index: i + 1,
          kind: q.kind,
          questaoIdRef: q.questaoIdRef,
          enunciado: q.enunciado.substring(0, 100) + (q.enunciado.length > 100 ? "..." : ""),
          alternativas: q.alternativasEvolutivas.length,
          isFinal: q.isFinal,
        };
      }
      return {
        index: i + 1,
        kind: q.kind,
        tipo: q.tipo,
        enunciado: q.enunciado.substring(0, 100) + (q.enunciado.length > 100 ? "..." : ""),
        alternativas: q.alternativas.length,
        gabarito: q.gabarito,
      };
    });
  };

  const handleValidate = async () => {
    if (!txtContent.trim()) {
      toast.error("Conteúdo vazio. Selecione um arquivo ou cole o texto.");
      return;
    }

    if (isLocalMode) {
      // Client-side parse
      const result = parseTxt(txtContent, avaliacaoTipo);
      setPreview(buildPreview(result.questoes));
      setErrors(result.errors);
      setTotalBlocks(result.totalBlocks);
      setParsedQuestoes(result.questoes);
      setParsedPaciente(result.paciente || null);
      setStep("preview");
      return;
    }

    // API mode
    setLoading(true);
    try {
      const res = await fetch("/api/avaliacoes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          avaliacaoId,
          txtContent,
          mode: "validate",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Erro ao validar arquivo.");
        return;
      }

      setPreview(data.preview || []);
      setErrors(data.errors || []);
      setTotalBlocks(data.totalBlocks || 0);
      setStep("preview");
    } catch {
      toast.error("Erro de conexão ao validar.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (isLocalMode) {
      // Local mode: return parsed questoes + paciente to parent
      onQuestoesImported?.(parsedQuestoes);
      if (parsedPaciente) {
        onPacienteImported?.(parsedPaciente);
      }
      setImportedCount(parsedQuestoes.length);
      setStep("result");
      const parts: string[] = [];
      if (parsedQuestoes.length > 0) parts.push(`${parsedQuestoes.length} questões`);
      if (parsedPaciente) parts.push("dados do paciente");
      toast.success(`${parts.join(" e ")} carregados no formulário.`);
      return;
    }

    // API mode
    setLoading(true);
    try {
      const res = await fetch("/api/avaliacoes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          avaliacaoId,
          txtContent,
          mode: "import",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        }
        toast.error(data.message || "Erro ao importar questões.");
        return;
      }

      setImportedCount(data.imported || 0);
      setStep("result");
      toast.success(data.message);
      onImportSuccess?.(data.imported || 0);
    } catch {
      toast.error("Erro de conexão ao importar.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const tipoLabel: Record<string, string> = {
    "pre-teste": "Pré-Teste",
    "pos-teste": "Pós-Teste",
    prova: "Prova",
    simulacao: "Simulação",
    "prova-video": "Prova de Vídeo",
    "simulado-evolutivo": "Simulado Evolutivo",
  };

  const actionLabel = isLocalMode ? "Carregar no Formulário" : "Importar";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4 text-primary" />
            Importar Questões via TXT
          </DialogTitle>
          <DialogDescription>
            Tipo da avaliação:{" "}
            <Badge variant="secondary" className="text-[10px]">
              {tipoLabel[avaliacaoTipo] || avaliacaoTipo}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                "hover:border-primary/50 hover:bg-primary/5",
                fileName ? "border-primary/30 bg-primary/5" : "border-border/50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                className="hidden"
                onChange={handleFileChange}
              />
              {fileName ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {txtContent.length} caracteres carregados
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Clique para selecionar um arquivo .txt
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ou cole o conteúdo no campo abaixo
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Ou cole o conteúdo aqui:
              </label>
              <textarea
                value={txtContent}
                onChange={(e) => {
                  setTxtContent(e.target.value);
                  setFileName("");
                }}
                placeholder={getPlaceholder(avaliacaoTipo)}
                className="w-full h-48 rounded-lg border border-border/50 bg-muted/30 p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleValidate}
                disabled={!txtContent.trim() || loading}
                className="bg-primary hover:bg-primary/90"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Validar e Pré-visualizar
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{totalBlocks} blocos encontrados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-sba-success" />
                <span>{preview.length} questões válidas</span>
              </div>
              {errors.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-sba-error" />
                  <span>{errors.length} erros</span>
                </div>
              )}
            </div>

            {parsedPaciente && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 space-y-1">
                  <p className="text-xs font-semibold text-primary flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Dados do Paciente detectados
                  </p>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span><strong>Nome:</strong> {parsedPaciente.nome}</span>
                    <span><strong>Idade:</strong> {parsedPaciente.idade}</span>
                    <span><strong>Sexo:</strong> {parsedPaciente.sexo === "F" ? "Feminino" : "Masculino"}</span>
                    <span><strong>FC:</strong> {parsedPaciente.sinaisVitais.frequenciaCardiaca} bpm</span>
                    <span><strong>PA:</strong> {parsedPaciente.sinaisVitais.pressaoArterial}</span>
                    <span><strong>SpO2:</strong> {parsedPaciente.sinaisVitais.saturacaoOxigenio}%</span>
                    <span><strong>Status:</strong> {parsedPaciente.statusPaciente}</span>
                    <span><strong>ECG:</strong> {parsedPaciente.ecg.status}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {errors.length > 0 && (
              <Card className="border-sba-error/30 bg-sba-error/5">
                <CardContent className="p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-sba-error flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Erros encontrados
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {errors.map((err, i) => (
                      <p key={i} className="text-[11px] text-sba-error/80">
                        Questão {err.questaoIndex}: {err.message}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {preview.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/50">
                {preview.map((item) => (
                  <div key={item.index} className="px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-mono text-muted-foreground shrink-0">
                          Q{item.index}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 shrink-0"
                        >
                          {item.kind === "evolutiva"
                            ? "evolutiva"
                            : item.tipo || "multipla"}
                        </Badge>
                        <span className="truncate">{item.enunciado}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                        <span>{item.alternativas} alt.</span>
                        {item.gabarito && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">
                            {item.gabarito}
                          </Badge>
                        )}
                        {item.questaoIdRef && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">
                            {item.questaoIdRef}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={errors.length > 0 || preview.length === 0 || loading}
                  className="bg-sba-orange hover:bg-sba-orange/90 text-white"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {actionLabel} {preview.length} Questões
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === "result" && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-sba-success" />
            <div>
              <p className="text-lg font-semibold">
                {isLocalMode ? "Questões Carregadas" : "Importação Concluída"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {importedCount} questões{parsedPaciente ? " e dados do paciente" : ""} {isLocalMode ? "adicionados ao formulário" : "importados com sucesso"}.
              </p>
            </div>
            <Button onClick={handleClose} className="bg-primary hover:bg-primary/90">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Placeholder text per avaliação type
// ---------------------------------------------------------------------------

function getPlaceholder(tipo: string): string {
  if (tipo === "simulado-evolutivo") {
    return `@PACIENTE_NOME: João da Silva
@PACIENTE_IDADE: 55
@PACIENTE_SEXO: M
@PACIENTE_QUEIXA: Dor torácica intensa
@PACIENTE_HISTORICO: Hipertensão, tabagismo
@PACIENTE_MEDICACOES: Losartana 50mg
@PACIENTE_FC: 110
@PACIENTE_PA: 140/90
@PACIENTE_SPO2: 95
@PACIENTE_FR: 20
@PACIENTE_TEMP: 36.8
@PACIENTE_ECG_ST: 0
@PACIENTE_ECG_STATUS: Normal
@PACIENTE_STATUS: Estável
---
@QUESTAO_ID_REF: q1
@ENUNCIADO: Qual sua conduta inicial?
@IS_FINAL: false

@ALT_EVOLUTIVA_INICIO
@ID: alt1
@TEXTO: Solicitar ECG
@TIPO_RESPOSTA: Mais Correto
@VALOR: 100
@PROXIMA_QUESTAO: q2
@RETROALIMENTACAO: Conduta adequada.
@ALT_EVOLUTIVA_FIM
---
@QUESTAO_ID_REF: q2
@ENUNCIADO: Próxima decisão...
...`;
  }

  if (tipo === "prova-video") {
    return `@TIPO: multipla
@ENUNCIADO: Qual técnica anestésica é demonstrada?
@ALTERNATIVA_A: Raquianestesia
@ALTERNATIVA_B: Peridural
@ALTERNATIVA_C: Bloqueio de plexo
@ALTERNATIVA_D: Anestesia geral
@GABARITO: B
@VIDEO_ID: dQw4w9WgXcQ
@TIMESTAMP_PARADA: 120
@TEMPO_RESPOSTA: 60
---
@TIPO: multipla
@ENUNCIADO: Próxima questão...
...`;
  }

  return `@TIPO: multipla
@ENUNCIADO: Qual dos seguintes é o agente anestésico mais potente?
@ALTERNATIVA_A: Sevoflurano
@ALTERNATIVA_B: Desflurano
@ALTERNATIVA_C: Isoflurano
@ALTERNATIVA_D: Halotano
@ALTERNATIVA_E: Óxido nitroso
@GABARITO: A
@RESPOSTA_COMENTADA: O sevoflurano possui menor CAM...
@FONTE: Miller, 9ª edição
---
@TIPO: discursiva
@ENUNCIADO: Descreva o mecanismo de ação dos relaxantes musculares despolarizantes.
---
@TIPO: multipla
@ENUNCIADO: Próxima questão...
...`;
}
