/**
 * TXT Question Import Parser
 *
 * Parses structured TXT files into question objects for all avaliação types.
 *
 * Format: Each question is separated by `---` on its own line.
 * Directives start with `@DIRECTIVE:` followed by the value.
 * Multi-line values continue on subsequent lines until the next directive.
 *
 * See docs/importacao-questoes-txt.md for full format specification.
 */

import type {
  ParsedQuestao,
  ParsedQuestaoStandard,
  ParsedQuestaoVideo,
  ParsedQuestaoEvolutiva,
  ParsedAlternativaEvolutiva,
  ParsedImpactoSinaisVitais,
  ParsedImpactoECG,
  ParsedPacienteInicial,
  ParseError,
  ParseResult,
} from './types';
import { VALID_LETRAS } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Trim and normalize line endings */
function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Split text into question blocks by `---` separator */
function splitBlocks(text: string): string[] {
  const normalized = normalize(text);
  // Split by lines that are exactly `---` (optionally with whitespace)
  const blocks = normalized.split(/\n\s*---\s*\n/);
  // Filter out empty blocks
  return blocks.map((b) => b.trim()).filter((b) => b.length > 0);
}

/** Parse directives from a block of text. Returns a Map<string, string>. */
function parseDirectives(block: string): Map<string, string> {
  const directives = new Map<string, string>();
  const lines = block.split('\n');
  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    // Check if this line starts a new directive
    const match = line.match(/^@([A-Z_0-9]+):\s*(.*)/);
    if (match) {
      // Save previous directive
      if (currentKey) {
        directives.set(currentKey, currentValue.trim());
      }
      currentKey = match[1];
      currentValue = match[2];
    } else if (currentKey) {
      // Continuation of previous directive value (multi-line)
      currentValue += '\n' + line;
    }
    // Lines before the first directive are ignored
  }

  // Save the last directive
  if (currentKey) {
    directives.set(currentKey, currentValue.trim());
  }

  return directives;
}

/** Map of unaccented/variant status values to their canonical accented form */
const STATUS_NORMALIZE_MAP: Record<string, string> = {
  'estavel': 'Estável',
  'estável': 'Estável',
  'instavel': 'Instável',
  'instável': 'Instável',
  'critico': 'Crítico',
  'crítico': 'Crítico',
  'grave': 'Grave',
  'melhorando': 'Melhorando',
  'piorando': 'Piorando',
};

/** Normalize a patient status value to its canonical accented form */
function normalizeStatus(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return STATUS_NORMALIZE_MAP[lower] || raw;
}

/** Parse a number, returning null if invalid */
function parseNum(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null;
  const n = Number(val.trim());
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Standard question parser (pre-teste, pos-teste, prova, simulacao)
// ---------------------------------------------------------------------------

function parseStandardQuestion(
  directives: Map<string, string>,
  index: number,
): { question: ParsedQuestaoStandard | null; errors: ParseError[] } {
  const errors: ParseError[] = [];

  const tipo = (directives.get('TIPO') || 'multipla').toLowerCase().trim();
  if (tipo !== 'multipla' && tipo !== 'discursiva') {
    errors.push({ questaoIndex: index, message: `Tipo inválido: "${tipo}". Use "multipla" ou "discursiva".` });
    return { question: null, errors };
  }

  const enunciado = directives.get('ENUNCIADO') || '';
  if (!enunciado || enunciado.length < 5) {
    errors.push({ questaoIndex: index, message: 'Enunciado é obrigatório (mínimo 5 caracteres).' });
    return { question: null, errors };
  }

  // Parse alternativas
  const alternativas: Array<{ letra: string; texto: string }> = [];
  for (const letra of VALID_LETRAS) {
    const texto = directives.get(`ALTERNATIVA_${letra}`);
    if (texto && texto.trim()) {
      alternativas.push({ letra, texto: texto.trim() });
    }
  }

  // Validate for multipla
  let gabarito: string | null = null;
  if (tipo === 'multipla') {
    if (alternativas.length < 2) {
      errors.push({ questaoIndex: index, message: 'Questão de múltipla escolha deve ter ao menos 2 alternativas.' });
      return { question: null, errors };
    }
    gabarito = (directives.get('GABARITO') || '').toUpperCase().trim();
    if (!gabarito || !VALID_LETRAS.includes(gabarito as typeof VALID_LETRAS[number])) {
      errors.push({ questaoIndex: index, message: `Gabarito inválido: "${gabarito}". Deve ser uma letra de A a E.` });
      return { question: null, errors };
    }
    // Check gabarito is one of the provided alternatives
    const letras = alternativas.map((a) => a.letra);
    if (!letras.includes(gabarito)) {
      errors.push({ questaoIndex: index, message: `Gabarito "${gabarito}" não corresponde a nenhuma alternativa fornecida (${letras.join(', ')}).` });
      return { question: null, errors };
    }
  }

  const pontuacaoRaw = parseNum(directives.get('PONTUACAO'));

  const question: ParsedQuestaoStandard = {
    kind: 'standard',
    tipo: tipo as 'multipla' | 'discursiva',
    enunciado,
    alternativas,
    gabarito: tipo === 'multipla' ? gabarito : null,
    respostaComentada: directives.get('RESPOSTA_COMENTADA') || '',
    fonteBibliografica: directives.get('FONTE') || '',
    imagemUrl: directives.get('IMAGEM_URL') || '',
    videoUrl: directives.get('VIDEO_URL') || '',
    pontuacao: pontuacaoRaw && pontuacaoRaw > 0 ? pontuacaoRaw : 1,
  };

  return { question, errors };
}

// ---------------------------------------------------------------------------
// Prova-video question parser
// ---------------------------------------------------------------------------

function parseVideoQuestion(
  directives: Map<string, string>,
  index: number,
): { question: ParsedQuestaoVideo | null; errors: ParseError[] } {
  // First parse as standard
  const { question: stdQuestion, errors: stdErrors } = parseStandardQuestion(directives, index);
  if (!stdQuestion) return { question: null, errors: stdErrors };

  const errors: ParseError[] = [...stdErrors];

  // Parse video config
  const videoId = directives.get('VIDEO_ID') || '';
  if (!videoId) {
    errors.push({ questaoIndex: index, message: 'VIDEO_ID é obrigatório para questões de prova-video.' });
    return { question: null, errors };
  }

  const timestampParada = parseNum(directives.get('TIMESTAMP_PARADA'));
  if (timestampParada === null || timestampParada < 0) {
    errors.push({ questaoIndex: index, message: 'TIMESTAMP_PARADA é obrigatório e deve ser >= 0 (em segundos).' });
    return { question: null, errors };
  }

  const tempoResposta = parseNum(directives.get('TEMPO_RESPOSTA'));
  if (tempoResposta === null || tempoResposta <= 0) {
    errors.push({ questaoIndex: index, message: 'TEMPO_RESPOSTA é obrigatório e deve ser > 0 (em segundos).' });
    return { question: null, errors };
  }

  const question: ParsedQuestaoVideo = {
    ...stdQuestion,
    kind: 'video',
    videoConfig: {
      videoId,
      timestampParada,
      tempoResposta,
    },
  };

  return { question, errors };
}

// ---------------------------------------------------------------------------
// Simulado-evolutivo question parser
// ---------------------------------------------------------------------------

/** Parse a single alternativa evolutiva block */
function parseAlternativaEvolutiva(
  block: string,
  questaoIndex: number,
  altIndex: number,
): { alt: ParsedAlternativaEvolutiva | null; errors: ParseError[] } {
  const errors: ParseError[] = [];
  const directives = parseDirectives(block);

  const id = directives.get('ID') || '';
  if (!id) {
    errors.push({ questaoIndex, message: `Alternativa evolutiva ${altIndex + 1}: ID é obrigatório.` });
    return { alt: null, errors };
  }

  const texto = directives.get('TEXTO') || '';
  if (!texto) {
    errors.push({ questaoIndex, message: `Alternativa evolutiva ${altIndex + 1}: TEXTO é obrigatório.` });
    return { alt: null, errors };
  }

  const tipoResp = (directives.get('TIPO_RESPOSTA') || '').trim();
  if (tipoResp !== 'Mais Correto' && tipoResp !== 'Menos Correto') {
    errors.push({ questaoIndex, message: `Alternativa evolutiva ${altIndex + 1}: TIPO_RESPOSTA deve ser "Mais Correto" ou "Menos Correto".` });
    return { alt: null, errors };
  }

  const valor = parseNum(directives.get('VALOR'));
  if (valor === null || valor < 0 || valor > 100) {
    errors.push({ questaoIndex, message: `Alternativa evolutiva ${altIndex + 1}: VALOR deve ser entre 0 e 100.` });
    return { alt: null, errors };
  }

  // Parse impacto nos sinais vitais
  let impacto: ParsedImpactoSinaisVitais | null = null;
  const hasImpacto = directives.has('IMPACTO_FC') || directives.has('IMPACTO_PA') ||
    directives.has('IMPACTO_SPO2') || directives.has('IMPACTO_FR') || directives.has('IMPACTO_TEMP');

  if (hasImpacto) {
    impacto = {
      frequenciaCardiaca: parseNum(directives.get('IMPACTO_FC')),
      pressaoArterial: directives.get('IMPACTO_PA')?.trim() || null,
      saturacaoOxigenio: parseNum(directives.get('IMPACTO_SPO2')),
      frequenciaRespiratoria: parseNum(directives.get('IMPACTO_FR')),
      temperatura: parseNum(directives.get('IMPACTO_TEMP')),
    };
  }

  // Parse impacto no ECG
  let impactoECG: ParsedImpactoECG | null = null;
  const hasECG = directives.has('IMPACTO_ECG_ST') || directives.has('IMPACTO_ECG_STATUS');
  if (hasECG) {
    const stDesvio = parseNum(directives.get('IMPACTO_ECG_ST'));
    impactoECG = {
      segmentoST: stDesvio !== null ? { desvio: stDesvio } : null,
      status: directives.get('IMPACTO_ECG_STATUS')?.trim() || null,
    };
  }

  const proximaQuestao = directives.get('PROXIMA_QUESTAO')?.trim() || null;
  const rawStatus = directives.get('IMPACTO_STATUS')?.trim() || null;
  // Normalize accents: docs use "Estavel"/"Instavel" but UI uses accented forms
  const impactoNoStatus = rawStatus ? normalizeStatus(rawStatus) : null;

  const alt: ParsedAlternativaEvolutiva = {
    id,
    texto,
    tipo: tipoResp,
    valor,
    proximaQuestao,
    retroalimentacao: directives.get('RETROALIMENTACAO') || '',
    impactoNoSinaisVitais: impacto,
    impactoNoECG: impactoECG,
    impactoNoStatus,
  };

  return { alt, errors };
}

function parseEvolutivaQuestion(
  block: string,
  _directives: Map<string, string>,
  index: number,
): { question: ParsedQuestaoEvolutiva | null; errors: ParseError[] } {
  const errors: ParseError[] = [];

  // Extract alternativas evolutivas blocks FIRST (before stripping them)
  // Format: @ALT_EVOLUTIVA_INICIO ... @ALT_EVOLUTIVA_FIM
  const altBlocks: string[] = [];
  const altPattern = /@ALT_EVOLUTIVA_INICIO\s*\n([\s\S]*?)@ALT_EVOLUTIVA_FIM/g;
  let altMatch;
  while ((altMatch = altPattern.exec(block)) !== null) {
    altBlocks.push(altMatch[1].trim());
  }

  // Strip ALT blocks from the text before parsing question-level directives.
  // This prevents @ALT_EVOLUTIVA_INICIO (which has no colon) from being
  // appended as continuation text to the previous directive (e.g. CONTEXTO_CLINICO).
  const blockWithoutAlts = block
    .replace(/@ALT_EVOLUTIVA_INICIO\s*\n[\s\S]*?@ALT_EVOLUTIVA_FIM/g, '')
    .trim();
  const directives = parseDirectives(blockWithoutAlts);

  const questaoIdRef = directives.get('QUESTAO_ID_REF') || '';
  if (!questaoIdRef) {
    errors.push({ questaoIndex: index, message: 'QUESTAO_ID_REF é obrigatório para questões evolutivas.' });
    return { question: null, errors };
  }

  const enunciado = directives.get('ENUNCIADO') || '';
  if (!enunciado || enunciado.length < 5) {
    errors.push({ questaoIndex: index, message: 'Enunciado é obrigatório (mínimo 5 caracteres).' });
    return { question: null, errors };
  }

  const isFinalStr = (directives.get('IS_FINAL') || 'false').toLowerCase().trim();
  const isFinal = isFinalStr === 'true' || isFinalStr === 'sim' || isFinalStr === '1';

  if (altBlocks.length === 0) {
    errors.push({ questaoIndex: index, message: 'Questão evolutiva deve ter pelo menos 1 alternativa (@ALT_EVOLUTIVA_INICIO ... @ALT_EVOLUTIVA_FIM).' });
    return { question: null, errors };
  }

  const alternativasEvolutivas: ParsedAlternativaEvolutiva[] = [];
  for (let i = 0; i < altBlocks.length; i++) {
    const { alt, errors: altErrors } = parseAlternativaEvolutiva(altBlocks[i], index, i);
    errors.push(...altErrors);
    if (alt) alternativasEvolutivas.push(alt);
  }

  if (alternativasEvolutivas.length === 0) {
    return { question: null, errors };
  }

  const pontuacaoRaw = parseNum(directives.get('PONTUACAO'));

  const question: ParsedQuestaoEvolutiva = {
    kind: 'evolutiva',
    questaoIdRef,
    enunciado,
    contextoClinico: directives.get('CONTEXTO_CLINICO') || '',
    isFinal,
    alternativasEvolutivas,
    imagemUrl: directives.get('IMAGEM_URL') || '',
    videoUrl: directives.get('VIDEO_URL') || '',
    pontuacao: pontuacaoRaw && pontuacaoRaw > 0 ? pontuacaoRaw : 1,
  };

  return { question, errors };
}

// ---------------------------------------------------------------------------
// Patient data parser (simulado-evolutivo)
// ---------------------------------------------------------------------------

/**
 * Check if a block is a patient data block (starts with @PACIENTE_NOME or
 * is wrapped in @PACIENTE_INICIO / @PACIENTE_FIM).
 */
function isPacienteBlock(block: string): boolean {
  return block.includes('@PACIENTE_NOME:') || block.includes('@PACIENTE_INICIO');
}

/**
 * Parse a patient data block into ParsedPacienteInicial.
 * Accepts either a block wrapped in @PACIENTE_INICIO / @PACIENTE_FIM
 * or a plain block with @PACIENTE_* directives.
 */
function parsePacienteBlock(
  block: string,
): { paciente: ParsedPacienteInicial | null; errors: ParseError[] } {
  const errors: ParseError[] = [];

  // Strip wrapper markers if present
  const cleaned = block
    .replace(/@PACIENTE_INICIO\s*\n?/, '')
    .replace(/@PACIENTE_FIM\s*$/, '')
    .trim();

  const directives = parseDirectives(cleaned);

  const nome = directives.get('PACIENTE_NOME') || '';
  if (!nome) {
    errors.push({ questaoIndex: 0, message: 'Dados do paciente: PACIENTE_NOME é obrigatório.' });
    return { paciente: null, errors };
  }

  const idadeRaw = parseNum(directives.get('PACIENTE_IDADE'));
  const sexo = (directives.get('PACIENTE_SEXO') || 'M').trim().toUpperCase();

  const paciente: ParsedPacienteInicial = {
    nome,
    idade: idadeRaw ?? 0,
    sexo: sexo === 'F' ? 'F' : 'M',
    queixa: directives.get('PACIENTE_QUEIXA') || '',
    historico: directives.get('PACIENTE_HISTORICO') || '',
    medicacoes: directives.get('PACIENTE_MEDICACOES') || '',
    sinaisVitais: {
      frequenciaCardiaca: parseNum(directives.get('PACIENTE_FC')) ?? 80,
      pressaoArterial: directives.get('PACIENTE_PA')?.trim() || '120/80',
      saturacaoOxigenio: parseNum(directives.get('PACIENTE_SPO2')) ?? 98,
      frequenciaRespiratoria: parseNum(directives.get('PACIENTE_FR')) ?? 16,
      temperatura: parseNum(directives.get('PACIENTE_TEMP')) ?? 36.5,
    },
    ecg: {
      segmentoST: { desvio: parseNum(directives.get('PACIENTE_ECG_ST')) ?? 0 },
      status: directives.get('PACIENTE_ECG_STATUS')?.trim() || 'Normal',
    },
    statusPaciente: directives.get('PACIENTE_STATUS')?.trim() || 'Estável',
  };

  return { paciente, errors };
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse a TXT file content into question objects.
 *
 * @param text - The raw TXT content
 * @param avaliacaoTipo - The type of the avaliação (determines parsing rules)
 * @returns ParseResult with parsed questions and any errors
 */
export function parseTxt(
  text: string,
  avaliacaoTipo: string,
): ParseResult {
  if (!text || !text.trim()) {
    return {
      success: false,
      questoes: [],
      errors: [{ questaoIndex: 0, message: 'O arquivo está vazio.' }],
      totalBlocks: 0,
    };
  }

  const blocks = splitBlocks(text);
  if (blocks.length === 0) {
    return {
      success: false,
      questoes: [],
      errors: [{ questaoIndex: 0, message: 'Nenhuma questão encontrada. Separe questões com "---".' }],
      totalBlocks: 0,
    };
  }

  const questoes: ParsedQuestao[] = [];
  const allErrors: ParseError[] = [];
  const isEvolutivo = avaliacaoTipo === 'simulado-evolutivo';
  const isVideo = avaliacaoTipo === 'prova-video';

  // For simulado-evolutivo, check if first block is patient data
  let paciente: ParsedPacienteInicial | undefined;
  let questionBlocks = blocks;

  if (isEvolutivo) {
    const firstBlock = blocks[0];
    if (isPacienteBlock(firstBlock)) {
      const { paciente: parsed, errors: pErrors } = parsePacienteBlock(firstBlock);
      allErrors.push(...pErrors);
      if (parsed) paciente = parsed;
      // Remove patient block from question blocks
      questionBlocks = blocks.slice(1);
    }
  }

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i];
    const directives = parseDirectives(block);

    if (isEvolutivo) {
      const { question, errors } = parseEvolutivaQuestion(block, directives, i + 1);
      allErrors.push(...errors);
      if (question) questoes.push(question);
    } else if (isVideo) {
      const { question, errors } = parseVideoQuestion(directives, i + 1);
      allErrors.push(...errors);
      if (question) questoes.push(question);
    } else {
      const { question, errors } = parseStandardQuestion(directives, i + 1);
      allErrors.push(...errors);
      if (question) questoes.push(question);
    }
  }

  return {
    success: allErrors.length === 0 && questoes.length > 0,
    questoes,
    errors: allErrors,
    totalBlocks: questionBlocks.length,
    ...(paciente ? { paciente } : {}),
  };
}
