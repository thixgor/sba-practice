"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  FileText,
  Settings,
  ListChecks,
  Eye,
  Play,
  FileDown,
  X,
  Infinity,
  Pencil,
  Upload,
  Video,
  Clock,
  Info,
} from "lucide-react";
import { ImportQuestoesTxt } from "@/components/admin/ImportQuestoesTxt";
import type { ParsedQuestao, ParsedPacienteInicial } from "@/lib/import/types";

// ─── Standard question ───
interface Questao {
  _id?: string;
  tipo: "multipla" | "discursiva";
  enunciado: string;
  alternativas: Array<{ letra: string; texto: string }>;
  gabarito: string;
  respostaComentada: string;
  fonteBibliografica: string;
  imagemUrl: string;
  videoUrl: string;
}

// ─── Prova de Vídeo ───
interface QuestaoVideo {
  id: string;
  timestampParada: string;
  tempoResposta: string;
  enunciado: string;
  alternativas: Array<{ letra: string; texto: string }>;
  gabarito: string;
  respostaComentada: string;
  fonteBibliografica: string;
}

let _videoQId = 0;
function nextVideoQId() {
  return `vq_${Date.now()}_${++_videoQId}`;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── Simulado Evolutivo ───
interface AlternativaEvolutiva {
  id: string;
  texto: string;
  tipo: "Mais Correto" | "Menos Correto";
  valor: number;
  proximaQuestao: string;
  impactoNoSinaisVitais: {
    frequenciaCardiaca: number | null;
    pressaoArterial: string | null;
    saturacaoOxigenio: number | null;
    frequenciaRespiratoria: number | null;
    temperatura: number | null;
  } | null;
  impactoNoECG: {
    segmentoST: { desvio: number } | null;
    status: string | null;
  } | null;
  impactoNoStatus: string;
  retroalimentacao: string;
}

interface QuestaoEvolutiva {
  questaoIdRef: string;
  enunciado: string;
  contextoClinico: string;
  isFinal: boolean;
  alternativasEvolutivas: AlternativaEvolutiva[];
  imagemUrl: string;
  videoUrl: string;
}

interface PacienteInicial {
  nome: string;
  idade: string;
  sexo: string;
  queixa: string;
  historico: string;
  medicacoes: string;
  sinaisVitais: {
    frequenciaCardiaca: string;
    pressaoArterial: string;
    saturacaoOxigenio: string;
    frequenciaRespiratoria: string;
    temperatura: string;
  };
  ecg: {
    ondaP: { amplitude: string; duracao: string };
    complexoQRS: { amplitude: string; duracao: string };
    ondaT: { amplitude: string; duracao: string };
    segmentoST: { desvio: string };
    status: string;
  };
  statusPaciente: string;
}

interface Curso {
  _id: string;
  name: string;
}

interface AvaliacaoRef {
  _id: string;
  name: string;
  protocolId?: string;
  tipo?: string;
}

const steps = [
  { label: "Informações", icon: FileText },
  { label: "Configuração", icon: Settings },
  { label: "Questões", icon: ListChecks },
  { label: "Revisão", icon: Eye },
];

const ALTERNATIVAS_ABCD = [
  { letra: "A", texto: "" },
  { letra: "B", texto: "" },
  { letra: "C", texto: "" },
  { letra: "D", texto: "" },
];

const ALTERNATIVAS_ABCDE = [
  { letra: "A", texto: "" },
  { letra: "B", texto: "" },
  { letra: "C", texto: "" },
  { letra: "D", texto: "" },
  { letra: "E", texto: "" },
];

function getDefaultAlternativas(padrao: string) {
  return padrao === "ABCDE" ? [...ALTERNATIVAS_ABCDE] : [...ALTERNATIVAS_ABCD];
}

// ─────────────────────────────────────────────────────
export default function EditarAvaliacaoPage() {
  const params = useParams();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [allAvaliacoes, setAllAvaliacoes] = useState<AvaliacaoRef[]>([]);

  // Step 1: Basic info
  const [info, setInfo] = useState({
    name: "",
    description: "",
    tipo: "prova" as string,
    cursoId: "",
    preTesteId: "",
    isActive: true,
  });

  // Step 2: Configuration
  const [config, setConfig] = useState({
    tempoLimiteMinutos: "",
    feedbackImediato: false,
    feedbackFinal: true,
    dataLiberacaoGabarito: "",
    embaralharQuestoes: false,
    embaralharAlternativas: false,
    tentativasPermitidas: "1",
    tentativasIlimitadas: false,
    alternativasPadrao: "ABCD",
    acessoPublico: false,
  });

  // Step 3: Standard Questions
  const [questoes, setQuestoes] = useState<Questao[]>([]);

  // Simulado Evolutivo
  const [paciente, setPaciente] = useState<PacienteInicial>({
    nome: "", idade: "", sexo: "M", queixa: "", historico: "", medicacoes: "",
    sinaisVitais: { frequenciaCardiaca: "80", pressaoArterial: "120/80", saturacaoOxigenio: "98", frequenciaRespiratoria: "16", temperatura: "36.5" },
    ecg: { ondaP: { amplitude: "0.1", duracao: "0.08" }, complexoQRS: { amplitude: "1.2", duracao: "0.08" }, ondaT: { amplitude: "0.3", duracao: "0.20" }, segmentoST: { desvio: "0" }, status: "Normal" },
    statusPaciente: "Estável",
  });
  const [questoesEvolutivas, setQuestoesEvolutivas] = useState<QuestaoEvolutiva[]>([]);

  // Prova de Vídeo
  const [videoInfo, setVideoInfo] = useState({
    videoUrl: "",
    legendaVideo: "",
    modoFinalizacao: "ir-para-resultado" as string,
  });
  const [questoesVideo, setQuestoesVideo] = useState<QuestaoVideo[]>([]);

  const isEvolutivo = info.tipo === "simulado-evolutivo";
  const isProvaVideo = info.tipo === "prova-video";

  // Import TXT
  const [importOpen, setImportOpen] = useState(false);

  // Preview
  const [previewMode, setPreviewMode] = useState<null | "user" | "pdf">(null);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // ─── Load dropdown data ───
  useEffect(() => {
    fetch("/api/cursos", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCursos(data.cursos || []))
      .catch(() => {});
    fetch("/api/avaliacoes", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAllAvaliacoes(data.avaliacoes || []))
      .catch(() => {});
  }, []);

  // ─── Load existing avaliação ───
  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/avaliacoes/${params.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const av = data.avaliacao || data;
        const tentativas = av.configuracao?.tentativasPermitidas;
        const isUnlimited = tentativas === 0;

        setInfo({
          name: av.name || "",
          description: av.description || "",
          tipo: av.tipo || "prova",
          cursoId: av.curso?._id || av.curso || "",
          preTesteId: av.preTeste?._id || av.preTeste || "",
          isActive: av.isActive ?? true,
        });

        setConfig({
          alternativasPadrao: av.configuracao?.alternativasPadrao || "ABCD",
          tempoLimiteMinutos: av.configuracao?.tempoLimiteMinutos?.toString() || "",
          feedbackImediato: av.configuracao?.feedbackImediato || false,
          feedbackFinal: av.configuracao?.feedbackFinal ?? true,
          dataLiberacaoGabarito: av.configuracao?.dataLiberacaoGabarito
            ? new Date(av.configuracao.dataLiberacaoGabarito).toISOString().slice(0, 16)
            : "",
          embaralharQuestoes: av.configuracao?.embaralharQuestoes || false,
          embaralharAlternativas: av.configuracao?.embaralharAlternativas || false,
          tentativasPermitidas: isUnlimited ? "1" : (tentativas?.toString() || "1"),
          tentativasIlimitadas: isUnlimited,
          acessoPublico: av.configuracao?.acessoPublico || false,
        });

        const tipo = av.tipo || "prova";

        // ── Load per-type data ──
        if (tipo === "simulado-evolutivo") {
          // Paciente Inicial
          const pi = av.pacienteInicial;
          if (pi) {
            setPaciente({
              nome: pi.nome || "",
              idade: pi.idade?.toString() || "",
              sexo: pi.sexo || "M",
              queixa: pi.queixa || "",
              historico: pi.historico || "",
              medicacoes: pi.medicacoes || "",
              sinaisVitais: {
                frequenciaCardiaca: pi.sinaisVitais?.frequenciaCardiaca?.toString() || "80",
                pressaoArterial: pi.sinaisVitais?.pressaoArterial || "120/80",
                saturacaoOxigenio: pi.sinaisVitais?.saturacaoOxigenio?.toString() || "98",
                frequenciaRespiratoria: pi.sinaisVitais?.frequenciaRespiratoria?.toString() || "16",
                temperatura: pi.sinaisVitais?.temperatura?.toString() || "36.5",
              },
              ecg: {
                ondaP: { amplitude: pi.ecg?.ondaP?.amplitude?.toString() || "0.1", duracao: pi.ecg?.ondaP?.duracao?.toString() || "0.08" },
                complexoQRS: { amplitude: pi.ecg?.complexoQRS?.amplitude?.toString() || "1.2", duracao: pi.ecg?.complexoQRS?.duracao?.toString() || "0.08" },
                ondaT: { amplitude: pi.ecg?.ondaT?.amplitude?.toString() || "0.3", duracao: pi.ecg?.ondaT?.duracao?.toString() || "0.20" },
                segmentoST: { desvio: pi.ecg?.segmentoST?.desvio?.toString() || "0" },
                status: pi.ecg?.status || "Normal",
              },
              statusPaciente: pi.statusPaciente || "Estável",
            });
          }
          // Questões evolutivas
          if (Array.isArray(av.questoes)) {
            const evs: QuestaoEvolutiva[] = av.questoes
              .filter((q: Record<string, unknown>) => typeof q === "object" && q.enunciado)
              .map((q: Record<string, unknown>) => ({
                questaoIdRef: (q.questaoIdRef as string) || "",
                enunciado: (q.enunciado as string) || "",
                contextoClinico: typeof q.contextoClinico === "object" && q.contextoClinico !== null
                  ? ((q.contextoClinico as Record<string, string>).atualizacao || "")
                  : ((q.contextoClinico as string) || ""),
                isFinal: (q.isFinal as boolean) || false,
                alternativasEvolutivas: Array.isArray(q.alternativasEvolutivas)
                  ? (q.alternativasEvolutivas as AlternativaEvolutiva[]).map((alt) => ({
                      id: alt.id || `alt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      texto: alt.texto || "",
                      tipo: alt.tipo || "Mais Correto",
                      valor: alt.valor ?? 0,
                      proximaQuestao: alt.proximaQuestao || "",
                      impactoNoSinaisVitais: alt.impactoNoSinaisVitais || null,
                      impactoNoECG: alt.impactoNoECG || null,
                      impactoNoStatus: alt.impactoNoStatus || "",
                      retroalimentacao: alt.retroalimentacao || "",
                    }))
                  : [],
                imagemUrl: (q.imagemUrl as string) || "",
                videoUrl: (q.videoUrl as string) || "",
              }));
            setQuestoesEvolutivas(evs);
          }
        } else if (tipo === "prova-video") {
          // Video Info
          setVideoInfo({
            videoUrl: av.videoUrl || "",
            legendaVideo: av.legendaVideo || "",
            modoFinalizacao: av.modoFinalizacao || "ir-para-resultado",
          });
          // Video questions (videoConfig.videoId is stripped by API for security)
          if (Array.isArray(av.questoes)) {
            const vqs: QuestaoVideo[] = av.questoes
              .filter((q: Record<string, unknown>) => typeof q === "object" && q.enunciado)
              .map((q: Record<string, unknown>) => {
                const vc = q.videoConfig as Record<string, unknown> | undefined;
                return {
                  id: nextVideoQId(),
                  timestampParada: vc?.timestampParada?.toString() || "",
                  tempoResposta: vc?.tempoResposta?.toString() || "60",
                  enunciado: (q.enunciado as string) || "",
                  alternativas: Array.isArray(q.alternativas) ? q.alternativas as Array<{ letra: string; texto: string }> : [],
                  gabarito: (q.gabarito as string) || "",
                  respostaComentada: (q.respostaComentada as string) || "",
                  fonteBibliografica: (q.fonteBibliografica as string) || "",
                };
              });
            setQuestoesVideo(vqs);
          }
        } else {
          // Standard questions
          if (Array.isArray(av.questoes)) {
            const loadedQuestoes: Questao[] = av.questoes
              .filter((q: Record<string, unknown>) => typeof q === "object" && q.enunciado)
              .map((q: Record<string, unknown>) => ({
                _id: (q._id as string)?.toString() || undefined,
                tipo: ((q.tipo as string) || "multipla") as "multipla" | "discursiva",
                enunciado: (q.enunciado as string) || "",
                alternativas: Array.isArray(q.alternativas) ? q.alternativas as Array<{ letra: string; texto: string }> : [],
                gabarito: (q.gabarito as string) || "",
                respostaComentada: (q.respostaComentada as string) || "",
                fonteBibliografica: (q.fonteBibliografica as string) || "",
                imagemUrl: (q.imagemUrl as string) || "",
                videoUrl: (q.videoUrl as string) || "",
              }));
            setQuestoes(loadedQuestoes);
          }
        }
      })
      .catch(() => toast.error("Erro ao carregar avaliação"))
      .finally(() => setLoading(false));
  }, [params.id]);

  // ─── Standard question helpers ───
  const addQuestion = () => {
    setQuestoes((prev) => [
      ...prev,
      { tipo: "multipla", enunciado: "", alternativas: getDefaultAlternativas(config.alternativasPadrao), gabarito: "", respostaComentada: "", fonteBibliografica: "", imagemUrl: "", videoUrl: "" },
    ]);
  };
  const removeQuestion = (i: number) => setQuestoes((prev) => prev.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, field: string, value: unknown) => {
    setQuestoes((prev) => prev.map((q, idx) => (idx === i ? { ...q, [field]: value } : q)));
  };
  const updateAlternativa = (qi: number, ai: number, texto: string) => {
    setQuestoes((prev) =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        const alts = [...q.alternativas];
        alts[ai] = { ...alts[ai], texto };
        return { ...q, alternativas: alts };
      })
    );
  };
  const handleAlternativasPadraoChange = (newPadrao: string) => {
    setConfig({ ...config, alternativasPadrao: newPadrao });
    const letras = newPadrao === "ABCDE" ? ["A", "B", "C", "D", "E"] : ["A", "B", "C", "D"];
    setQuestoes((prev) =>
      prev.map((q) => {
        if (q.tipo !== "multipla") return q;
        const newAlts = letras.map((letra) => {
          const existing = q.alternativas.find((a) => a.letra === letra);
          return existing || { letra, texto: "" };
        });
        const gabarito = letras.includes(q.gabarito) ? q.gabarito : "";
        return { ...q, alternativas: newAlts, gabarito };
      })
    );
  };

  // ─── Evolutivo helpers ───
  const addQuestaoEvolutiva = () => {
    const nextId = `Q${questoesEvolutivas.length + 1}`;
    setQuestoesEvolutivas((prev) => [
      ...prev,
      { questaoIdRef: nextId, enunciado: "", contextoClinico: "", isFinal: false, alternativasEvolutivas: [], imagemUrl: "", videoUrl: "" },
    ]);
  };
  const removeQuestaoEvolutiva = (i: number) => setQuestoesEvolutivas((prev) => prev.filter((_, idx) => idx !== i));
  const updateQuestaoEvolutiva = (i: number, field: string, value: unknown) => {
    setQuestoesEvolutivas((prev) => prev.map((q, idx) => (idx === i ? { ...q, [field]: value } : q)));
  };
  const addAlternativaEvolutiva = (qi: number) => {
    setQuestoesEvolutivas((prev) =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        const nextAltId = `${q.questaoIdRef}_A${q.alternativasEvolutivas.length + 1}`;
        return {
          ...q,
          alternativasEvolutivas: [
            ...q.alternativasEvolutivas,
            { id: nextAltId, texto: "", tipo: "Mais Correto" as const, valor: 0, proximaQuestao: "", impactoNoSinaisVitais: null, impactoNoECG: null, impactoNoStatus: "", retroalimentacao: "" },
          ],
        };
      })
    );
  };
  const removeAlternativaEvolutiva = (qi: number, ai: number) => {
    setQuestoesEvolutivas((prev) =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        return { ...q, alternativasEvolutivas: q.alternativasEvolutivas.filter((_, idx) => idx !== ai) };
      })
    );
  };
  const updateAlternativaEvolutiva = (qi: number, ai: number, field: string, value: unknown) => {
    setQuestoesEvolutivas((prev) =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        const alts = q.alternativasEvolutivas.map((alt, j) => (j === ai ? { ...alt, [field]: value } : alt));
        return { ...q, alternativasEvolutivas: alts };
      })
    );
  };

  // ─── Import TXT handler ───
  const handleQuestoesImported = useCallback((parsed: ParsedQuestao[]) => {
    if (isEvolutivo) {
      const evs: QuestaoEvolutiva[] = parsed
        .filter((q) => q.kind === "evolutiva")
        .map((q) => {
          const eq = q as Extract<ParsedQuestao, { kind: "evolutiva" }>;
          return {
            questaoIdRef: eq.questaoIdRef,
            enunciado: eq.enunciado,
            contextoClinico: eq.contextoClinico || "",
            isFinal: eq.isFinal,
            alternativasEvolutivas: eq.alternativasEvolutivas.map((alt) => ({
              id: alt.id, texto: alt.texto, tipo: alt.tipo, valor: alt.valor,
              proximaQuestao: alt.proximaQuestao || "",
              impactoNoSinaisVitais: alt.impactoNoSinaisVitais || null,
              impactoNoECG: alt.impactoNoECG || null,
              impactoNoStatus: alt.impactoNoStatus || "",
              retroalimentacao: alt.retroalimentacao || "",
            })),
            imagemUrl: eq.imagemUrl || "",
            videoUrl: eq.videoUrl || "",
          };
        });
      setQuestoesEvolutivas((prev) => [...prev, ...evs]);
    } else {
      const stds: Questao[] = parsed
        .filter((q) => q.kind === "standard" || q.kind === "video")
        .map((q) => {
          const sq = q as Extract<ParsedQuestao, { kind: "standard" | "video" }>;
          return {
            tipo: sq.tipo,
            enunciado: sq.enunciado,
            alternativas: sq.alternativas,
            gabarito: sq.gabarito || "",
            respostaComentada: sq.respostaComentada || "",
            fonteBibliografica: sq.fonteBibliografica || "",
            imagemUrl: sq.imagemUrl || "",
            videoUrl: sq.videoUrl || "",
          };
        });
      if (isProvaVideo) {
        const videoQs: QuestaoVideo[] = stds.map((sq) => ({
          id: nextVideoQId(),
          timestampParada: "",
          tempoResposta: "60",
          enunciado: sq.enunciado,
          alternativas: sq.alternativas,
          gabarito: sq.gabarito,
          respostaComentada: sq.respostaComentada,
          fonteBibliografica: sq.fonteBibliografica,
        }));
        setQuestoesVideo((prev) => [...prev, ...videoQs]);
      } else {
        setQuestoes((prev) => [...prev, ...stds]);
      }
    }
  }, [isEvolutivo, isProvaVideo]);

  const handlePacienteImported = useCallback((p: ParsedPacienteInicial) => {
    setPaciente({
      nome: p.nome, idade: String(p.idade), sexo: p.sexo, queixa: p.queixa,
      historico: p.historico, medicacoes: p.medicacoes,
      sinaisVitais: {
        frequenciaCardiaca: String(p.sinaisVitais.frequenciaCardiaca),
        pressaoArterial: p.sinaisVitais.pressaoArterial,
        saturacaoOxigenio: String(p.sinaisVitais.saturacaoOxigenio),
        frequenciaRespiratoria: String(p.sinaisVitais.frequenciaRespiratoria),
        temperatura: String(p.sinaisVitais.temperatura),
      },
      ecg: {
        ondaP: { amplitude: "0.1", duracao: "0.08" },
        complexoQRS: { amplitude: "1.2", duracao: "0.08" },
        ondaT: { amplitude: "0.3", duracao: "0.20" },
        segmentoST: { desvio: String(p.ecg.segmentoST.desvio) },
        status: p.ecg.status,
      },
      statusPaciente: p.statusPaciente,
    });
  }, []);

  // ─── Submit ───
  const handleSubmit = async () => {
    if (!info.name) { toast.error("Nome da avaliação é obrigatório"); setCurrentStep(0); return; }
    const hasQuestions = isEvolutivo ? questoesEvolutivas.length > 0 : isProvaVideo ? questoesVideo.length > 0 : questoes.length > 0;
    if (!hasQuestions) { toast.error("Adicione pelo menos uma questão"); setCurrentStep(2); return; }

    if (isProvaVideo) {
      const videoId = extractYouTubeId(videoInfo.videoUrl);
      if (!videoId) { toast.error("URL do YouTube inválida"); setCurrentStep(0); return; }
      const timestamps = questoesVideo.map((qv) => Number(qv.timestampParada));
      const unique = new Set(timestamps);
      if (unique.size !== timestamps.length) { toast.error("Existem timestamps duplicados"); setCurrentStep(2); return; }
    }

    setSubmitting(true);
    try {
      const baseBody: Record<string, unknown> = {
        name: info.name,
        description: info.description,
        tipo: info.tipo,
        cursoId: info.cursoId || null,
        preTesteId: info.tipo === "pos-teste" && info.preTesteId ? info.preTesteId : null,
        isActive: info.isActive,
        configuracao: {
          tempoLimiteMinutos: config.tempoLimiteMinutos ? Number(config.tempoLimiteMinutos) : null,
          feedbackImediato: config.feedbackImediato,
          feedbackFinal: config.feedbackFinal,
          dataLiberacaoGabarito: config.dataLiberacaoGabarito || null,
          embaralharQuestoes: config.embaralharQuestoes,
          embaralharAlternativas: config.embaralharAlternativas,
          tentativasPermitidas: config.tentativasIlimitadas ? 0 : (Number(config.tentativasPermitidas) || 1),
          alternativasPadrao: config.alternativasPadrao,
          acessoPublico: config.acessoPublico,
        },
      };

      if (isEvolutivo) {
        baseBody.pacienteInicial = {
          nome: paciente.nome, idade: Number(paciente.idade) || 0, sexo: paciente.sexo,
          queixa: paciente.queixa, historico: paciente.historico, medicacoes: paciente.medicacoes,
          sinaisVitais: {
            frequenciaCardiaca: Number(paciente.sinaisVitais.frequenciaCardiaca) || 80,
            pressaoArterial: paciente.sinaisVitais.pressaoArterial || "120/80",
            saturacaoOxigenio: Number(paciente.sinaisVitais.saturacaoOxigenio) || 98,
            frequenciaRespiratoria: Number(paciente.sinaisVitais.frequenciaRespiratoria) || 16,
            temperatura: Number(paciente.sinaisVitais.temperatura) || 36.5,
          },
          ecg: {
            ondaP: { amplitude: Number(paciente.ecg.ondaP.amplitude) || 0.1, duracao: Number(paciente.ecg.ondaP.duracao) || 0.08 },
            complexoQRS: { amplitude: Number(paciente.ecg.complexoQRS.amplitude) || 1.2, duracao: Number(paciente.ecg.complexoQRS.duracao) || 0.08 },
            ondaT: { amplitude: Number(paciente.ecg.ondaT.amplitude) || 0.3, duracao: Number(paciente.ecg.ondaT.duracao) || 0.20 },
            segmentoST: { desvio: Number(paciente.ecg.segmentoST.desvio) || 0 },
            status: paciente.ecg.status || "Normal",
          },
          statusPaciente: paciente.statusPaciente || "Estável",
        };
        baseBody.questoesEvolutivas = questoesEvolutivas.map((q, i) => ({
          questaoIdRef: q.questaoIdRef,
          enunciado: q.enunciado,
          contextoClinico: q.contextoClinico ? { atualizacao: q.contextoClinico } : null,
          isFinal: q.isFinal,
          alternativasEvolutivas: q.alternativasEvolutivas,
          imagemUrl: q.imagemUrl || undefined,
          videoUrl: q.videoUrl || undefined,
          ordem: i + 1,
          pontuacao: 1,
        }));
      } else if (isProvaVideo) {
        const videoId = extractYouTubeId(videoInfo.videoUrl)!;
        baseBody.videoUrl = videoInfo.videoUrl;
        baseBody.legendaVideo = videoInfo.legendaVideo || null;
        baseBody.modoFinalizacao = videoInfo.modoFinalizacao;
        baseBody.questoes = questoesVideo.map((qv, i) => ({
          tipo: "multipla",
          enunciado: qv.enunciado,
          alternativas: qv.alternativas,
          gabarito: qv.gabarito,
          respostaComentada: qv.respostaComentada || "",
          fonteBibliografica: qv.fonteBibliografica || "",
          videoConfig: {
            videoId,
            timestampParada: Number(qv.timestampParada) || 0,
            tempoResposta: Number(qv.tempoResposta) || 60,
          },
          ordem: i + 1,
          pontuacao: 1,
        }));
      } else {
        baseBody.questoes = questoes.map((q, i) => ({
          tipo: q.tipo,
          enunciado: q.enunciado,
          alternativas: q.tipo === "multipla" ? q.alternativas : [],
          gabarito: q.tipo === "multipla" ? q.gabarito : null,
          respostaComentada: q.respostaComentada,
          fonteBibliografica: q.fonteBibliografica,
          imagemUrl: q.imagemUrl || undefined,
          videoUrl: q.videoUrl || undefined,
          ordem: i + 1,
          pontuacao: 1,
        }));
      }

      const res = await fetch(`/api/avaliacoes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseBody),
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Avaliação atualizada com sucesso!");
        router.push("/admin/avaliacoes");
      } else {
        const err = await res.json();
        toast.error(err.message || "Erro ao atualizar avaliação");
      }
    } catch {
      toast.error("Erro ao atualizar avaliação");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── PDF Preview ───
  const handlePreviewPdf = async () => {
    const totalQ = isEvolutivo ? questoesEvolutivas.length : isProvaVideo ? questoesVideo.length : questoes.length;
    if (totalQ === 0) { toast.error("Adicione pelo menos uma questão"); return; }
    setGeneratingPdf(true);
    try {
      const { generateReportPDF } = await import("@/lib/pdf/generateReport");
      const previewQuestoes = isProvaVideo ? questoesVideo : questoes;
      const doc = generateReportPDF({
        protocolId: "SBA-2026-PREVIEW-00000000",
        userName: "Usuário de Exemplo",
        crm: "123456-RJ",
        avaliacaoName: info.name || "Avaliação sem nome",
        tipo: info.tipo,
        cursoName: cursos.find((c) => c._id === info.cursoId)?.name,
        pontuacaoObtida: Math.round(previewQuestoes.length * 0.7),
        pontuacaoTotal: previewQuestoes.length,
        percentualAcerto: 70,
        duracaoSegundos: (Number(config.tempoLimiteMinutos) || 30) * 60 * 0.6,
        dataRealizacao: new Date(),
        respostas: previewQuestoes.map((q, i) => ({
          questaoNumero: i + 1,
          enunciado: q.enunciado || `Questão ${i + 1}`,
          alternativaSelecionada: q.gabarito || "A",
          gabarito: q.gabarito || "A",
          correta: i < Math.round(previewQuestoes.length * 0.7),
        })),
        gabaritoLiberado: true,
      });
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      toast.error("Erro ao gerar preview do PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ─── Filters ───
  const preTesteOptions = allAvaliacoes.filter(
    (a) => a._id !== params.id && (a.tipo === "pre-teste" || a.tipo === "pos-teste" || a.tipo === "prova")
  );

  // ─── Loading ───
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64 skeleton-sba" />
        <Skeleton className="h-12 rounded-xl skeleton-sba" />
        <Skeleton className="h-96 rounded-xl skeleton-sba" />
      </div>
    );
  }

  // ===================================================================
  // RENDER
  // ===================================================================
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <Pencil className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Editar Avaliação</h1>
          <Badge variant={info.isActive ? "default" : "secondary"} className="text-[10px]">
            {info.isActive ? "Ativa" : "Inativa"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Edite os dados da avaliação seguindo as etapas abaixo.
        </p>
      </motion.div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <div key={step.label} className="flex items-center flex-1">
              <button
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all w-full",
                  isActive && "bg-primary/10 text-primary",
                  isCompleted && "bg-sba-success/10 text-sba-success",
                  !isActive && !isCompleted && "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-sba-success text-white",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className="hidden sm:inline truncate">{step.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={cn("h-px w-4 shrink-0", isCompleted ? "bg-sba-success" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <motion.div key={currentStep} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>

        {/* ══════════════ Step 1: Basic Info ══════════════ */}
        {currentStep === 0 && (
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome *</Label>
                <Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} placeholder="Nome da avaliação" className="bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição</Label>
                <Textarea value={info.description} onChange={(e) => setInfo({ ...info, description: e.target.value })} placeholder="Descrição da avaliação" className="bg-muted/50 border-border/50 resize-none" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo *</Label>
                  <Select value={info.tipo} onValueChange={(v) => setInfo({ ...info, tipo: v })}>
                    <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-teste">Pré-Teste</SelectItem>
                      <SelectItem value="pos-teste">Pós-Teste</SelectItem>
                      <SelectItem value="prova">Prova</SelectItem>
                      <SelectItem value="simulacao">Simulação</SelectItem>
                      <SelectItem value="prova-video">Prova de Vídeo</SelectItem>
                      <SelectItem value="simulado-evolutivo">Simulado Evolutivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Curso</Label>
                  <Select value={info.cursoId || "_none"} onValueChange={(v) => setInfo({ ...info, cursoId: v === "_none" ? "" : v })}>
                    <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Nenhum</SelectItem>
                      {cursos.map((c) => (<SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pre-teste linking */}
              {info.tipo === "pos-teste" && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vincular a Pré-Teste</Label>
                  <Select value={info.preTesteId || "_none"} onValueChange={(v) => setInfo({ ...info, preTesteId: v === "_none" ? "" : v })}>
                    <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Nenhum</SelectItem>
                      {preTesteOptions.map((a) => (<SelectItem key={a._id} value={a._id}>{a.name} {a.tipo && `(${a.tipo})`}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Prova de Vídeo config */}
              {isProvaVideo && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-sba-orange" />
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuração do Vídeo</Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL do YouTube *</Label>
                      <Input value={videoInfo.videoUrl} onChange={(e) => setVideoInfo({ ...videoInfo, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="bg-muted/50 border-border/50" />
                      {videoInfo.videoUrl && extractYouTubeId(videoInfo.videoUrl) && (
                        <div className="rounded-lg overflow-hidden border border-border/50 bg-black aspect-video max-w-md">
                          <iframe src={`https://www.youtube.com/embed/${extractYouTubeId(videoInfo.videoUrl)}?controls=1&modestbranding=1`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope" allowFullScreen title="YouTube Preview" />
                        </div>
                      )}
                      {videoInfo.videoUrl && !extractYouTubeId(videoInfo.videoUrl) && (
                        <p className="text-xs text-sba-error">URL do YouTube inválida.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legenda / Observação</Label>
                      <Textarea value={videoInfo.legendaVideo} onChange={(e) => setVideoInfo({ ...videoInfo, legendaVideo: e.target.value })} placeholder="Observações exibidas ao aluno..." className="bg-muted/50 border-border/50 resize-none" rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modo de Finalização</Label>
                      <Select value={videoInfo.modoFinalizacao} onValueChange={(v) => setVideoInfo({ ...videoInfo, modoFinalizacao: v })}>
                        <SelectTrigger className="bg-muted/50 border-border/50 w-64"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ir-para-resultado">Ir para resultado</SelectItem>
                          <SelectItem value="continuar-video">Continuar vídeo após última questão</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        {videoInfo.modoFinalizacao === "continuar-video" ? "O vídeo continuará reproduzindo após a última questão." : "Resultado exibido imediatamente após a última questão."}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm font-medium">Status da Avaliação</p>
                  <p className="text-xs text-muted-foreground">Desativar impede novos acessos</p>
                </div>
                <Switch checked={info.isActive} onCheckedChange={(v) => setInfo({ ...info, isActive: v })} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ══════════════ Step 2: Configuration ══════════════ */}
        {currentStep === 1 && (
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tempo Limite (min)</Label>
                  <Input type="number" value={config.tempoLimiteMinutos} onChange={(e) => setConfig({ ...config, tempoLimiteMinutos: e.target.value })} placeholder="Sem limite" className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tentativas Permitidas</Label>
                  <div className="flex items-center gap-3">
                    <Switch checked={config.tentativasIlimitadas} onCheckedChange={(v) => setConfig({ ...config, tentativasIlimitadas: v, tentativasPermitidas: v ? "0" : "1" })} />
                    <span className="text-xs text-muted-foreground">Ilimitadas</span>
                  </div>
                  {config.tentativasIlimitadas ? (
                    <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                      <Infinity className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Tentativas ilimitadas</span>
                    </div>
                  ) : (
                    <Input type="number" value={config.tentativasPermitidas} onChange={(e) => setConfig({ ...config, tentativasPermitidas: e.target.value })} min={1} className="bg-muted/50 border-border/50" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Liberar Gabarito em</Label>
                <Input type="datetime-local" value={config.dataLiberacaoGabarito} onChange={(e) => setConfig({ ...config, dataLiberacaoGabarito: e.target.value })} className="bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alternativas Padrão</Label>
                <Select value={config.alternativasPadrao} onValueChange={handleAlternativasPadraoChange}>
                  <SelectTrigger className="bg-muted/50 border-border/50 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABCD">A, B, C, D</SelectItem>
                    <SelectItem value="ABCDE">A, B, C, D, E</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-4">
                {[
                  { key: "feedbackImediato", label: "Feedback Imediato", desc: "Mostrar resultado após cada questão" },
                  { key: "feedbackFinal", label: "Feedback Final", desc: "Mostrar resultado ao final da prova" },
                  { key: "embaralharQuestoes", label: "Embaralhar Questões", desc: "Ordem aleatória das questões" },
                  { key: "embaralharAlternativas", label: "Embaralhar Alternativas", desc: "Ordem aleatória das alternativas" },
                  { key: "acessoPublico", label: "Acesso Público", desc: "Disponível sem vínculo a curso" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch checked={config[item.key as keyof typeof config] as boolean} onCheckedChange={(v) => setConfig({ ...config, [item.key]: v })} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ══════════════ Step 3: Standard Questions ══════════════ */}
        {currentStep === 2 && !isEvolutivo && !isProvaVideo && (
          <div className="space-y-4">
            {questoes.map((q, qi) => (
              <Card key={qi} className="border-border/50 bg-card/80">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <CardTitle className="text-sm font-semibold">Questão {qi + 1}</CardTitle>
                      <Badge variant="secondary" className="text-[10px]">{q.tipo}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-sba-error" onClick={() => removeQuestion(qi)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={q.tipo} onValueChange={(v) => updateQuestion(qi, "tipo", v)}>
                    <SelectTrigger className="w-[140px] bg-muted/50 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multipla">Múltipla Escolha</SelectItem>
                      <SelectItem value="discursiva">Discursiva</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enunciado *</Label>
                    <Textarea value={q.enunciado} onChange={(e) => updateQuestion(qi, "enunciado", e.target.value)} placeholder="Texto da questão..." className="bg-muted/50 border-border/50 resize-none" rows={3} />
                  </div>
                  {q.tipo === "multipla" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alternativas</Label>
                        {q.alternativas.map((alt, ai) => (
                          <div key={ai} className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded bg-muted text-xs font-bold shrink-0">{alt.letra}</span>
                            <Input value={alt.texto} onChange={(e) => updateAlternativa(qi, ai, e.target.value)} placeholder={`Alternativa ${alt.letra}`} className="bg-muted/50 border-border/50 text-sm" />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gabarito *</Label>
                        <Select value={q.gabarito} onValueChange={(v) => updateQuestion(qi, "gabarito", v)}>
                          <SelectTrigger className="w-20 bg-muted/50 border-border/50"><SelectValue placeholder="?" /></SelectTrigger>
                          <SelectContent>{q.alternativas.map((alt) => (<SelectItem key={alt.letra} value={alt.letra}>{alt.letra}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resposta Comentada</Label>
                      <Textarea value={q.respostaComentada} onChange={(e) => updateQuestion(qi, "respostaComentada", e.target.value)} placeholder="Explicação do gabarito..." className="bg-muted/50 border-border/50 resize-none text-sm" rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fonte Bibliográfica</Label>
                      <Textarea value={q.fonteBibliografica} onChange={(e) => updateQuestion(qi, "fonteBibliografica", e.target.value)} placeholder="Referência..." className="bg-muted/50 border-border/50 resize-none text-sm" rows={2} />
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Imagem (URL)</Label>
                      <Input value={q.imagemUrl} onChange={(e) => updateQuestion(qi, "imagemUrl", e.target.value)} placeholder="https://..." className="bg-muted/50 border-border/50 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vídeo (URL)</Label>
                      <Input value={q.videoUrl} onChange={(e) => updateQuestion(qi, "videoUrl", e.target.value)} placeholder="https://youtube.com/..." className="bg-muted/50 border-border/50 text-sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" onClick={addQuestion} className="flex-1 border-dashed"><Plus className="mr-2 h-4 w-4" />Adicionar Questão</Button>
              <Button variant="outline" onClick={() => setImportOpen(true)} className="shrink-0"><Upload className="mr-2 h-4 w-4" />Importar TXT</Button>
            </div>
            <ImportQuestoesTxt avaliacaoTipo={info.tipo} open={importOpen} onOpenChange={setImportOpen} onQuestoesImported={handleQuestoesImported} />
          </div>
        )}

        {/* ══════════════ Step 3: Prova de Vídeo ══════════════ */}
        {currentStep === 2 && isProvaVideo && (
          <div className="space-y-4">
            <Card className="border-sba-orange/30 bg-sba-orange/5">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sba-orange/10 shrink-0"><Video className="h-4.5 w-4.5 text-sba-orange" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{videoInfo.videoUrl ? extractYouTubeId(videoInfo.videoUrl) ? "Vídeo configurado" : "URL inválida" : "Nenhum vídeo configurado"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{videoInfo.videoUrl || "Configure a URL na Etapa 1"}</p>
                  </div>
                  {questoesVideo.length > 0 && <Badge variant="secondary" className="text-[10px]">{questoesVideo.length} questões</Badge>}
                </div>
              </CardContent>
            </Card>

            {questoesVideo.map((qv, idx) => (
              <Card key={qv.id} className="border-border/50 bg-card/80">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sba-orange/10 text-sba-orange text-xs font-bold shrink-0">{idx + 1}</div>
                      <CardTitle className="text-sm font-semibold">Questão no Timestamp</CardTitle>
                      {Number(qv.timestampParada) > 0 && <Badge variant="secondary" className="text-[10px] font-mono">{formatTimestamp(Number(qv.timestampParada))}</Badge>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-sba-error" onClick={() => setQuestoesVideo((prev) => prev.filter((q) => q.id !== qv.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timestamp (seg) *</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" value={qv.timestampParada} onChange={(e) => setQuestoesVideo((prev) => prev.map((q) => q.id === qv.id ? { ...q, timestampParada: e.target.value } : q))} placeholder="0" min={0} className="bg-muted/50 border-border/50" />
                        {Number(qv.timestampParada) > 0 && <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">= {formatTimestamp(Number(qv.timestampParada))}</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tempo Resposta (seg)</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" value={qv.tempoResposta} onChange={(e) => setQuestoesVideo((prev) => prev.map((q) => q.id === qv.id ? { ...q, tempoResposta: e.target.value } : q))} placeholder="60" min={1} className="bg-muted/50 border-border/50" />
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enunciado *</Label>
                    <Textarea value={qv.enunciado} onChange={(e) => setQuestoesVideo((prev) => prev.map((q) => q.id === qv.id ? { ...q, enunciado: e.target.value } : q))} placeholder="Texto da questão..." className="bg-muted/50 border-border/50 resize-none" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alternativas</Label>
                    {qv.alternativas.map((alt, ai) => (
                      <div key={alt.letra} className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded bg-muted text-xs font-bold shrink-0">{alt.letra}</span>
                        <Input value={alt.texto} onChange={(e) => setQuestoesVideo((prev) => prev.map((q) => { if (q.id !== qv.id) return q; const alts = [...q.alternativas]; alts[ai] = { ...alts[ai], texto: e.target.value }; return { ...q, alternativas: alts }; }))} placeholder={`Alternativa ${alt.letra}`} className="bg-muted/50 border-border/50 text-sm" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gabarito *</Label>
                    <Select value={qv.gabarito} onValueChange={(v) => setQuestoesVideo((prev) => prev.map((q) => q.id === qv.id ? { ...q, gabarito: v } : q))}>
                      <SelectTrigger className="w-20 bg-muted/50 border-border/50"><SelectValue placeholder="?" /></SelectTrigger>
                      <SelectContent>{qv.alternativas.map((alt) => (<SelectItem key={alt.letra} value={alt.letra}>{alt.letra}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resposta Comentada</Label>
                      <Textarea value={qv.respostaComentada} onChange={(e) => setQuestoesVideo((prev) => prev.map((q) => q.id === qv.id ? { ...q, respostaComentada: e.target.value } : q))} placeholder="Explicação..." className="bg-muted/50 border-border/50 resize-none text-sm" rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fonte Bibliográfica</Label>
                      <Textarea value={qv.fonteBibliografica} onChange={(e) => setQuestoesVideo((prev) => prev.map((q) => q.id === qv.id ? { ...q, fonteBibliografica: e.target.value } : q))} placeholder="Referência..." className="bg-muted/50 border-border/50 resize-none text-sm" rows={2} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                const alts = config.alternativasPadrao === "ABCDE"
                  ? [{ letra: "A", texto: "" }, { letra: "B", texto: "" }, { letra: "C", texto: "" }, { letra: "D", texto: "" }, { letra: "E", texto: "" }]
                  : [{ letra: "A", texto: "" }, { letra: "B", texto: "" }, { letra: "C", texto: "" }, { letra: "D", texto: "" }];
                setQuestoesVideo((prev) => [...prev, { id: nextVideoQId(), timestampParada: "", tempoResposta: "60", enunciado: "", alternativas: alts, gabarito: "", respostaComentada: "", fonteBibliografica: "" }]);
              }} className="flex-1 border-dashed"><Plus className="mr-2 h-4 w-4" />Adicionar Questão no Timestamp</Button>
              <Button variant="outline" onClick={() => setImportOpen(true)} className="shrink-0"><Upload className="mr-2 h-4 w-4" />Importar TXT</Button>
            </div>
            <ImportQuestoesTxt avaliacaoTipo={info.tipo} open={importOpen} onOpenChange={setImportOpen} onQuestoesImported={handleQuestoesImported} />
          </div>
        )}

        {/* ══════════════ Step 3: Simulado Evolutivo ══════════════ */}
        {currentStep === 2 && isEvolutivo && (
          <div className="space-y-4">
            {/* Patient Data */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">P</span>Dados do Paciente</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nome</Label><Input value={paciente.nome} onChange={(e) => setPaciente({ ...paciente, nome: e.target.value })} placeholder="Nome do paciente" className="bg-background border-border/50 text-sm h-9" /></div>
                  <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Idade</Label><Input type="number" value={paciente.idade} onChange={(e) => setPaciente({ ...paciente, idade: e.target.value })} placeholder="45" className="bg-background border-border/50 text-sm h-9" /></div>
                  <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sexo</Label>
                    <Select value={paciente.sexo} onValueChange={(v) => setPaciente({ ...paciente, sexo: v })}><SelectTrigger className="bg-background border-border/50 h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent></Select>
                  </div>
                </div>
                <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Queixa Principal</Label><Input value={paciente.queixa} onChange={(e) => setPaciente({ ...paciente, queixa: e.target.value })} placeholder="Síncope durante repouso" className="bg-background border-border/50 text-sm h-9" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Histórico</Label><Textarea value={paciente.historico} onChange={(e) => setPaciente({ ...paciente, historico: e.target.value })} placeholder="Hipertensão, diabetes..." className="bg-background border-border/50 resize-none text-sm" rows={2} /></div>
                  <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Medicações</Label><Textarea value={paciente.medicacoes} onChange={(e) => setPaciente({ ...paciente, medicacoes: e.target.value })} placeholder="Losartana 50mg..." className="bg-background border-border/50 resize-none text-sm" rows={2} /></div>
                </div>
                <Separator />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sinais Vitais Iniciais</p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: "frequenciaCardiaca", label: "FC (bpm)", ph: "80" },
                    { key: "pressaoArterial", label: "PA", ph: "120/80" },
                    { key: "saturacaoOxigenio", label: "SpO2 (%)", ph: "98" },
                    { key: "frequenciaRespiratoria", label: "FR (irpm)", ph: "16" },
                    { key: "temperatura", label: "Temp (°C)", ph: "36.5" },
                  ].map((v) => (
                    <div key={v.key} className="space-y-1">
                      <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{v.label}</Label>
                      <Input value={paciente.sinaisVitais[v.key as keyof typeof paciente.sinaisVitais]} onChange={(e) => setPaciente({ ...paciente, sinaisVitais: { ...paciente.sinaisVitais, [v.key]: e.target.value } })} placeholder={v.ph} className="bg-background border-border/50 text-xs h-8" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ECG Inicial</p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">ST Desvio</Label><Input value={paciente.ecg.segmentoST.desvio} onChange={(e) => setPaciente({ ...paciente, ecg: { ...paciente.ecg, segmentoST: { desvio: e.target.value } } })} placeholder="0" className="bg-background border-border/50 text-xs h-8" /></div>
                  <div className="col-span-2 space-y-1"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Status ECG</Label><Input value={paciente.ecg.status} onChange={(e) => setPaciente({ ...paciente, ecg: { ...paciente.ecg, status: e.target.value } })} placeholder="Normal" className="bg-background border-border/50 text-xs h-8" /></div>
                  <div className="space-y-1"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Status Paciente</Label>
                    <Select value={paciente.statusPaciente} onValueChange={(v) => setPaciente({ ...paciente, statusPaciente: v })}><SelectTrigger className="bg-background border-border/50 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Estável">Estável</SelectItem><SelectItem value="Instável">Instável</SelectItem></SelectContent></Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evolutive Questions */}
            {questoesEvolutivas.map((q, qi) => (
              <Card key={qi} className="border-border/50 bg-card/80">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-semibold">Questão {qi + 1}</CardTitle>
                      <Badge variant="secondary" className="text-[10px]">{q.questaoIdRef}</Badge>
                      {q.isFinal && <Badge className="bg-sba-warning/10 text-sba-warning text-[10px]">Final</Badge>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-sba-error" onClick={() => removeQuestaoEvolutiva(qi)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ID Referência *</Label><Input value={q.questaoIdRef} onChange={(e) => updateQuestaoEvolutiva(qi, "questaoIdRef", e.target.value)} className="bg-muted/50 border-border/50 text-sm h-9" /></div>
                    <div className="flex items-end gap-3"><div className="flex items-center gap-2"><Switch checked={q.isFinal} onCheckedChange={(v) => updateQuestaoEvolutiva(qi, "isFinal", v)} /><span className="text-xs text-muted-foreground">Questão Final</span></div></div>
                  </div>
                  <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enunciado *</Label><Textarea value={q.enunciado} onChange={(e) => updateQuestaoEvolutiva(qi, "enunciado", e.target.value)} placeholder="Texto da questão..." className="bg-muted/50 border-border/50 resize-none text-sm" rows={3} /></div>
                  <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contexto Clínico</Label><Textarea value={q.contextoClinico} onChange={(e) => updateQuestaoEvolutiva(qi, "contextoClinico", e.target.value)} placeholder="Paciente chegou consciente..." className="bg-muted/50 border-border/50 resize-none text-sm" rows={2} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imagem (URL)</Label><Input value={q.imagemUrl} onChange={(e) => updateQuestaoEvolutiva(qi, "imagemUrl", e.target.value)} placeholder="https://..." className="bg-muted/50 border-border/50 text-sm h-9" /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vídeo (URL)</Label><Input value={q.videoUrl} onChange={(e) => updateQuestaoEvolutiva(qi, "videoUrl", e.target.value)} placeholder="https://..." className="bg-muted/50 border-border/50 text-sm h-9" /></div>
                  </div>
                  <Separator />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Alternativas Evolutivas</p>
                  {q.alternativasEvolutivas.map((alt, ai) => (
                    <Card key={ai} className={cn("border-l-4", alt.tipo === "Mais Correto" ? "border-l-sba-success" : "border-l-sba-warning")}>
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-[10px]", alt.tipo === "Mais Correto" ? "bg-sba-success/10 text-sba-success" : "bg-sba-warning/10 text-sba-warning")}>{alt.tipo}</Badge>
                            <span className="text-[10px] text-muted-foreground">{alt.id}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-sba-error" onClick={() => removeAlternativaEvolutiva(qi, ai)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                        <div className="space-y-1"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Texto *</Label><Input value={alt.texto} onChange={(e) => updateAlternativaEvolutiva(qi, ai, "texto", e.target.value)} placeholder="Realizar ECG imediatamente" className="bg-muted/50 border-border/50 text-sm h-9" /></div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</Label>
                            <Select value={alt.tipo} onValueChange={(v) => updateAlternativaEvolutiva(qi, ai, "tipo", v)}><SelectTrigger className="bg-muted/50 border-border/50 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Mais Correto">Mais Correto</SelectItem><SelectItem value="Menos Correto">Menos Correto</SelectItem></SelectContent></Select>
                          </div>
                          <div className="space-y-1"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Valor (pts)</Label><Input type="number" value={alt.valor} onChange={(e) => updateAlternativaEvolutiva(qi, ai, "valor", Number(e.target.value))} className="bg-muted/50 border-border/50 text-xs h-8" /></div>
                          <div className="space-y-1"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Próx. Questão</Label>
                            <Select value={alt.proximaQuestao || "__none__"} onValueChange={(v) => updateAlternativaEvolutiva(qi, ai, "proximaQuestao", v === "__none__" ? "" : v)}><SelectTrigger className="bg-muted/50 border-border/50 h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="__none__">Nenhuma</SelectItem>{questoesEvolutivas.filter((_, j) => j !== qi).map((oq) => (<SelectItem key={oq.questaoIdRef} value={oq.questaoIdRef}>{oq.questaoIdRef}</SelectItem>))}</SelectContent></Select>
                          </div>
                          <div className="space-y-1"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Status Paciente</Label>
                            <Select value={alt.impactoNoStatus || "__none__"} onValueChange={(v) => updateAlternativaEvolutiva(qi, ai, "impactoNoStatus", v === "__none__" ? "" : v)}><SelectTrigger className="bg-muted/50 border-border/50 h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="__none__">Sem mudança</SelectItem><SelectItem value="Estável">Estável</SelectItem><SelectItem value="Instável">Instável</SelectItem><SelectItem value="Crítico">Crítico</SelectItem><SelectItem value="Grave">Grave</SelectItem><SelectItem value="Melhorando">Melhorando</SelectItem><SelectItem value="Piorando">Piorando</SelectItem></SelectContent></Select>
                          </div>
                        </div>
                        <div className="space-y-1"><Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Retroalimentação</Label><Textarea value={alt.retroalimentacao} onChange={(e) => updateAlternativaEvolutiva(qi, ai, "retroalimentacao", e.target.value)} placeholder="Decisão correta! ECG é essencial..." className="bg-muted/50 border-border/50 resize-none text-xs" rows={2} /></div>
                        {/* Impacto nos Sinais Vitais */}
                        <div className="rounded-md border border-border/40 bg-muted/20 p-2.5 space-y-2">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Impacto nos Sinais Vitais</p>
                          <div className="grid grid-cols-5 gap-2">
                            {([
                              { key: "frequenciaCardiaca", label: "FC (±bpm)" },
                              { key: "pressaoArterial", label: "PA" },
                              { key: "saturacaoOxigenio", label: "SpO₂ (±%)" },
                              { key: "frequenciaRespiratoria", label: "FR (±irpm)" },
                              { key: "temperatura", label: "Temp (±°C)" },
                            ] as const).map((sv) => (
                              <div key={sv.key} className="space-y-0.5">
                                <Label className="text-[8px] text-muted-foreground">{sv.label}</Label>
                                {sv.key === "pressaoArterial" ? (
                                  <Input value={alt.impactoNoSinaisVitais?.pressaoArterial ?? ""} onChange={(e) => {
                                    const curr = alt.impactoNoSinaisVitais || { frequenciaCardiaca: null, pressaoArterial: null, saturacaoOxigenio: null, frequenciaRespiratoria: null, temperatura: null };
                                    updateAlternativaEvolutiva(qi, ai, "impactoNoSinaisVitais", { ...curr, pressaoArterial: e.target.value || null });
                                  }} placeholder="130/85" className="bg-muted/50 border-border/50 text-xs h-7" />
                                ) : (
                                  <Input type="number" step={sv.key === "temperatura" ? "0.1" : "1"} value={alt.impactoNoSinaisVitais?.[sv.key] ?? ""} onChange={(e) => {
                                    const v = e.target.value === "" ? null : Number(e.target.value);
                                    const curr = alt.impactoNoSinaisVitais || { frequenciaCardiaca: null, pressaoArterial: null, saturacaoOxigenio: null, frequenciaRespiratoria: null, temperatura: null };
                                    updateAlternativaEvolutiva(qi, ai, "impactoNoSinaisVitais", { ...curr, [sv.key]: v });
                                  }} placeholder="±" className="bg-muted/50 border-border/50 text-xs h-7" />
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground pt-1">Impacto no ECG</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5"><Label className="text-[8px] text-muted-foreground">Desvio ST (mm)</Label><Input type="number" step="0.1" value={alt.impactoNoECG?.segmentoST?.desvio ?? ""} onChange={(e) => {
                              const v = e.target.value === "" ? null : Number(e.target.value);
                              const curr = alt.impactoNoECG || { segmentoST: null, status: null };
                              updateAlternativaEvolutiva(qi, ai, "impactoNoECG", { ...curr, segmentoST: v !== null ? { desvio: v } : null });
                            }} placeholder="0" className="bg-muted/50 border-border/50 text-xs h-7" /></div>
                            <div className="space-y-0.5"><Label className="text-[8px] text-muted-foreground">Status ECG</Label>
                              <Select value={alt.impactoNoECG?.status || "__none__"} onValueChange={(v) => {
                                const curr = alt.impactoNoECG || { segmentoST: null, status: null };
                                updateAlternativaEvolutiva(qi, ai, "impactoNoECG", { ...curr, status: v === "__none__" ? null : v });
                              }}><SelectTrigger className="bg-muted/50 border-border/50 h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="__none__">Sem mudança</SelectItem><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Ritmo Sinusal">Ritmo Sinusal</SelectItem><SelectItem value="Taquicardia Sinusal">Taquicardia Sinusal</SelectItem><SelectItem value="Bradicardia Sinusal">Bradicardia Sinusal</SelectItem><SelectItem value="Fibrilação Atrial">Fibrilação Atrial</SelectItem><SelectItem value="Supra ST">Supra ST</SelectItem><SelectItem value="Infra ST">Infra ST</SelectItem><SelectItem value="Alterado">Alterado</SelectItem></SelectContent></Select>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addAlternativaEvolutiva(qi)} className="border-dashed text-xs"><Plus className="mr-1 h-3 w-3" /> Alternativa</Button>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" onClick={addQuestaoEvolutiva} className="flex-1 border-dashed"><Plus className="mr-2 h-4 w-4" />Adicionar Questão Evolutiva</Button>
              <Button variant="outline" onClick={() => setImportOpen(true)} className="shrink-0"><Upload className="mr-2 h-4 w-4" />Importar TXT</Button>
            </div>
            <ImportQuestoesTxt avaliacaoTipo={info.tipo} open={importOpen} onOpenChange={setImportOpen} onQuestoesImported={handleQuestoesImported} onPacienteImported={handlePacienteImported} />
          </div>
        )}

        {/* ══════════════ Step 4: Review ══════════════ */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Card className="border-border/50 bg-card/80">
              <CardHeader><CardTitle className="text-sm font-semibold">Revisão</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground text-xs">Nome:</span><p className="font-medium">{info.name || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs">Tipo:</span><p className="font-medium">{info.tipo}</p></div>
                  <div><span className="text-muted-foreground text-xs">Questões:</span><p className="font-medium">{isEvolutivo ? questoesEvolutivas.length : isProvaVideo ? questoesVideo.length : questoes.length}</p></div>
                  <div><span className="text-muted-foreground text-xs">Tempo:</span><p className="font-medium">{config.tempoLimiteMinutos ? `${config.tempoLimiteMinutos} min` : "Sem limite"}</p></div>
                  {!isEvolutivo && <div><span className="text-muted-foreground text-xs">Alternativas:</span><p className="font-medium">{config.alternativasPadrao === "ABCDE" ? "A, B, C, D, E" : "A, B, C, D"}</p></div>}
                  <div><span className="text-muted-foreground text-xs">Feedback Imediato:</span><p className="font-medium">{config.feedbackImediato ? "Sim" : "Não"}</p></div>
                  <div><span className="text-muted-foreground text-xs">Tentativas:</span><p className="font-medium">{config.tentativasIlimitadas ? "Ilimitadas" : config.tentativasPermitidas}</p></div>
                  <div><span className="text-muted-foreground text-xs">Embaralhar:</span><p className="font-medium">{config.embaralharQuestoes && config.embaralharAlternativas ? "Questões + Alternativas" : config.embaralharQuestoes ? "Apenas Questões" : config.embaralharAlternativas ? "Apenas Alternativas" : "Não"}</p></div>
                  <div><span className="text-muted-foreground text-xs">Status:</span><Badge variant={info.isActive ? "default" : "secondary"} className="text-[10px]">{info.isActive ? "Ativa" : "Inativa"}</Badge></div>
                  <div><span className="text-muted-foreground text-xs">Curso:</span><p className="font-medium">{cursos.find((c) => c._id === info.cursoId)?.name || "Nenhum"}</p></div>
                </div>
                {info.description && <div><span className="text-muted-foreground text-xs">Descrição:</span><p className="text-sm mt-1">{info.description}</p></div>}
                <Separator />

                {/* Per-type question summary */}
                {isEvolutivo ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1.5">Paciente</p>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span><strong>Nome:</strong> {paciente.nome || "—"}</span>
                        <span><strong>Idade:</strong> {paciente.idade || "—"}</span>
                        <span><strong>Sexo:</strong> {paciente.sexo === "F" ? "Feminino" : "Masculino"}</span>
                        <span><strong>FC:</strong> {paciente.sinaisVitais.frequenciaCardiaca} bpm</span>
                        <span><strong>PA:</strong> {paciente.sinaisVitais.pressaoArterial}</span>
                        <span><strong>SpO2:</strong> {paciente.sinaisVitais.saturacaoOxigenio}%</span>
                        <span><strong>Status:</strong> {paciente.statusPaciente}</span>
                        <span><strong>ECG:</strong> {paciente.ecg.status}</span>
                      </div>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questões Evolutivas ({questoesEvolutivas.length})</p>
                    {questoesEvolutivas.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                        <Badge variant="secondary" className="text-[10px] shrink-0">Q{i + 1}</Badge>
                        <Badge variant="outline" className="text-[10px] shrink-0">{q.questaoIdRef}</Badge>
                        <span className="truncate flex-1">{q.enunciado || "Sem enunciado"}</span>
                        <Badge variant="secondary" className="text-[10px]">{q.alternativasEvolutivas.length} alt.</Badge>
                        {q.isFinal && <Badge className="bg-sba-warning/10 text-sba-warning text-[10px]">Final</Badge>}
                      </div>
                    ))}
                  </div>
                ) : isProvaVideo ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-sba-orange/20 bg-sba-orange/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-sba-orange mb-1.5">Configuração do Vídeo</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span><strong>URL:</strong> {videoInfo.videoUrl || "—"}</span>
                        <span><strong>Modo:</strong> {videoInfo.modoFinalizacao === "continuar-video" ? "Continuar vídeo" : "Ir para resultado"}</span>
                        {videoInfo.legendaVideo && <span className="col-span-2"><strong>Legenda:</strong> {videoInfo.legendaVideo}</span>}
                      </div>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questões nos Timestamps ({questoesVideo.length})</p>
                    {[...questoesVideo].sort((a, b) => (Number(a.timestampParada) || 0) - (Number(b.timestampParada) || 0)).map((qv, sortedIdx) => (
                      <div key={qv.id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                        <Badge variant="secondary" className="text-[10px] shrink-0">Q{sortedIdx + 1}</Badge>
                        <Badge variant="outline" className="text-[10px] shrink-0 font-mono">{formatTimestamp(Number(qv.timestampParada) || 0)}</Badge>
                        <span className="truncate flex-1">{qv.enunciado || "Sem enunciado"}</span>
                        {qv.gabarito && <Badge variant="secondary" className="bg-sba-success/10 text-sba-success text-[10px]">{qv.gabarito}</Badge>}
                        <Badge variant="secondary" className="text-[10px]">{qv.tempoResposta || "60"}s</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questões ({questoes.length})</p>
                    {questoes.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                        <Badge variant="secondary" className="text-[10px] shrink-0">Q{i + 1}</Badge>
                        <span className="truncate flex-1">{q.enunciado || "Sem enunciado"}</span>
                        <Badge variant="secondary" className="text-[10px]">{q.tipo}</Badge>
                        {q.tipo === "multipla" && q.gabarito && <Badge variant="secondary" className="bg-sba-success/10 text-sba-success text-[10px]">{q.gabarito}</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview Buttons */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Visualizar Prévia</CardTitle>
                <p className="text-xs text-muted-foreground">Veja como a avaliação vai aparecer para os usuários.</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => {
                    const totalQ = isEvolutivo ? questoesEvolutivas.length : isProvaVideo ? questoesVideo.length : questoes.length;
                    if (totalQ === 0) { toast.error("Adicione pelo menos uma questão"); return; }
                    setPreviewQuestionIndex(0);
                    setPreviewMode("user");
                  }} className="gap-2"><Play className="h-4 w-4" />Preview como Usuário</Button>
                  {!isEvolutivo && (
                    <Button variant="outline" onClick={handlePreviewPdf} disabled={generatingPdf} className="gap-2">
                      {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                      {generatingPdf ? "Gerando..." : "Preview do PDF"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* User Preview Modal */}
            {previewMode === "user" && !isEvolutivo && questoes.length > 0 && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-background shadow-2xl border border-border/50">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur-sm px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">Preview — Visão do Usuário</Badge>
                      <span className="text-xs text-muted-foreground">Questão {previewQuestionIndex + 1} de {questoes.length}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewMode(null)}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="p-6 space-y-5">
                    {(() => {
                      const q = questoes[previewQuestionIndex];
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs font-semibold">Questão {previewQuestionIndex + 1} de {questoes.length}</Badge>
                            <span className="text-xs text-muted-foreground">{q.tipo === "multipla" ? "Múltipla Escolha" : "Discursiva"}</span>
                          </div>
                          <Card className="border-border/50 bg-card/80"><CardContent className="p-5"><p className="text-sm leading-relaxed whitespace-pre-wrap">{q.enunciado || "(Enunciado não preenchido)"}</p></CardContent></Card>
                          {q.tipo === "multipla" && (
                            <div className="space-y-2.5">
                              {q.alternativas.map((alt) => (
                                <div key={alt.letra} className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/50 p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5 cursor-pointer">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold">{alt.letra}</span>
                                  <span className="text-sm leading-relaxed pt-1 flex-1">{alt.texto || "(Alternativa vazia)"}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {q.tipo === "multipla" && q.gabarito && (
                            <div className="rounded-lg bg-sba-success/5 border border-sba-success/20 p-3 flex items-center gap-2">
                              <Check className="h-4 w-4 text-sba-success shrink-0" />
                              <span className="text-xs text-sba-success">Gabarito: <strong>{q.gabarito}</strong>{q.respostaComentada && ` — ${q.respostaComentada.substring(0, 80)}${q.respostaComentada.length > 80 ? "..." : ""}`}</span>
                            </div>
                          )}
                          <div className="flex justify-end"><Button disabled className="bg-primary/50 text-primary-foreground cursor-not-allowed">Confirmar Resposta<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="sticky bottom-0 flex items-center justify-between border-t border-border/50 bg-background/95 backdrop-blur-sm px-6 py-3">
                    <Button variant="outline" size="sm" onClick={() => setPreviewQuestionIndex((p) => Math.max(0, p - 1))} disabled={previewQuestionIndex === 0}><ChevronLeft className="mr-1 h-3.5 w-3.5" />Anterior</Button>
                    <div className="flex gap-1">
                      {questoes.map((_, i) => (<button key={i} onClick={() => setPreviewQuestionIndex(i)} className={cn("h-2 w-2 rounded-full transition-all", i === previewQuestionIndex ? "bg-primary w-4" : "bg-muted-foreground/20 hover:bg-muted-foreground/40")} />))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setPreviewQuestionIndex((p) => Math.min(questoes.length - 1, p + 1))} disabled={previewQuestionIndex === questoes.length - 1}>Próxima<ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => setCurrentStep((p) => Math.max(0, p - 1))} disabled={currentStep === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" />Anterior
        </Button>
        {currentStep < 3 ? (
          <Button onClick={() => setCurrentStep((p) => Math.min(3, p + 1))} className="bg-primary hover:bg-primary/90">
            Próximo<ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting} className="bg-sba-success hover:bg-sba-success/90 text-white">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            {submitting ? "Salvando..." : "Salvar Alterações"}
          </Button>
        )}
      </div>
    </div>
  );
}
