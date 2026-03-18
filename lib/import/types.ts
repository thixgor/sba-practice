/**
 * Types for TXT question import feature.
 *
 * Supports all avaliação types: pre-teste, pos-teste, prova, simulacao,
 * prova-video, simulado-evolutivo.
 */

// ---------------------------------------------------------------------------
// Parsed question types (output from parser)
// ---------------------------------------------------------------------------

/** Standard question (multipla / discursiva) for pre-teste, pos-teste, prova, simulacao */
export interface ParsedQuestaoStandard {
  kind: 'standard';
  tipo: 'multipla' | 'discursiva';
  enunciado: string;
  alternativas: Array<{ letra: string; texto: string }>;
  gabarito: string | null;
  respostaComentada: string;
  fonteBibliografica: string;
  imagemUrl: string;
  videoUrl: string;
  pontuacao: number;
}

/** Prova-video question (extends standard with video config) */
export interface ParsedQuestaoVideo {
  kind: 'video';
  tipo: 'multipla' | 'discursiva';
  enunciado: string;
  alternativas: Array<{ letra: string; texto: string }>;
  gabarito: string | null;
  respostaComentada: string;
  fonteBibliografica: string;
  imagemUrl: string;
  videoUrl: string;
  pontuacao: number;
  videoConfig: {
    videoId: string;
    timestampParada: number;
    tempoResposta: number;
  };
}

/** Impacto nos sinais vitais for evolutivo */
export interface ParsedImpactoSinaisVitais {
  frequenciaCardiaca: number | null;
  pressaoArterial: string | null;
  saturacaoOxigenio: number | null;
  frequenciaRespiratoria: number | null;
  temperatura: number | null;
}

/** Impacto no ECG for evolutivo */
export interface ParsedImpactoECG {
  segmentoST: { desvio: number } | null;
  status: string | null;
}

/** Alternativa evolutiva parsed from TXT */
export interface ParsedAlternativaEvolutiva {
  id: string;
  texto: string;
  tipo: 'Mais Correto' | 'Menos Correto';
  valor: number;
  proximaQuestao: string | null;
  retroalimentacao: string;
  impactoNoSinaisVitais: ParsedImpactoSinaisVitais | null;
  impactoNoECG: ParsedImpactoECG | null;
  impactoNoStatus: string | null;
}

/** Simulado-evolutivo question */
export interface ParsedQuestaoEvolutiva {
  kind: 'evolutiva';
  questaoIdRef: string;
  enunciado: string;
  contextoClinico: string;
  isFinal: boolean;
  alternativasEvolutivas: ParsedAlternativaEvolutiva[];
  imagemUrl: string;
  videoUrl: string;
  pontuacao: number;
}

/** Union of all parsed question types */
export type ParsedQuestao = ParsedQuestaoStandard | ParsedQuestaoVideo | ParsedQuestaoEvolutiva;

// ---------------------------------------------------------------------------
// Parsed patient data (simulado-evolutivo)
// ---------------------------------------------------------------------------

/** Patient initial data parsed from TXT @PACIENTE block */
export interface ParsedPacienteInicial {
  nome: string;
  idade: number;
  sexo: string;
  queixa: string;
  historico: string;
  medicacoes: string;
  sinaisVitais: {
    frequenciaCardiaca: number;
    pressaoArterial: string;
    saturacaoOxigenio: number;
    frequenciaRespiratoria: number;
    temperatura: number;
  };
  ecg: {
    segmentoST: { desvio: number };
    status: string;
  };
  statusPaciente: string;
}

// ---------------------------------------------------------------------------
// Parse result
// ---------------------------------------------------------------------------

export interface ParseError {
  questaoIndex: number;
  line?: number;
  message: string;
}

export interface ParseResult {
  success: boolean;
  questoes: ParsedQuestao[];
  errors: ParseError[];
  /** Total number of question blocks found in the text */
  totalBlocks: number;
  /** Parsed patient data (only for simulado-evolutivo) */
  paciente?: ParsedPacienteInicial;
}

// ---------------------------------------------------------------------------
// Avaliação types that support standard questions vs. special
// ---------------------------------------------------------------------------

export const STANDARD_AVALIACAO_TYPES = ['pre-teste', 'pos-teste', 'prova', 'simulacao'] as const;
export const VIDEO_AVALIACAO_TYPE = 'prova-video' as const;
export const EVOLUTIVO_AVALIACAO_TYPE = 'simulado-evolutivo' as const;

export type StandardAvaliacaoType = typeof STANDARD_AVALIACAO_TYPES[number];

/** Valid letters for alternatives */
export const VALID_LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;
