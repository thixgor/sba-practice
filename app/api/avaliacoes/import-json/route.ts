import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Questao from '@/lib/db/models/Questao';
import Curso from '@/lib/db/models/Curso';
import { withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { generateProtocolId } from '@/lib/utils/protocol';
import { encryptIfNeeded } from '@/lib/utils/crypto';

// Force model registration
void Questao;
void Curso;

// ---------------------------------------------------------------------------
// Types for the import payload
// ---------------------------------------------------------------------------

interface ImportAlternativa {
  letra: string;
  texto: string;
}

interface ImportVideoConfig {
  videoId: string;
  timestampParada: number;
  tempoResposta: number;
}

interface ImportAlternativaEvolutiva {
  id: string;
  texto: string;
  tipo: 'Mais Correto' | 'Menos Correto';
  valor: number;
  proximaQuestao?: string | null;
  impactoNoSinaisVitais?: Record<string, unknown> | null;
  impactoNoECG?: Record<string, unknown> | null;
  impactoNoStatus?: string | null;
  retroalimentacao?: string;
}

interface ImportContextoClinico {
  atualizacao: string;
  vitaisAtuais?: Record<string, unknown> | null;
}

interface ImportQuestao {
  tipo: 'multipla' | 'discursiva';
  enunciado: string;
  alternativas?: ImportAlternativa[];
  gabarito?: string | null;
  respostaComentada?: string | null;
  fonteBibliografica?: string | null;
  imagemUrl?: string | null;
  videoUrl?: string | null;
  ordem?: number;
  pontuacao?: number;
  videoConfig?: ImportVideoConfig | null;
  // Evolutivo
  questaoIdRef?: string | null;
  contextoClinico?: ImportContextoClinico | null;
  isFinal?: boolean;
  alternativasEvolutivas?: ImportAlternativaEvolutiva[];
}

interface ImportCursoRef {
  name: string;
  description?: string;
  imageUrl?: string | null;
  duracao?: number | null;
}

interface ImportAvaliacao {
  name: string;
  description?: string;
  tipo: string;
  protocolId?: string;
  configuracao?: Record<string, unknown>;
  isActive?: boolean;
  curso?: ImportCursoRef | null;
  preTesteRef?: { name: string; protocolId?: string } | null;
  pacienteInicial?: Record<string, unknown> | null;
  videoUrl?: string | null;
  legendaVideo?: string | null;
  modoFinalizacao?: string | null;
  questoes?: ImportQuestao[];
}

interface ImportPayload {
  _exportVersion?: string;
  avaliacoes: ImportAvaliacao[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_TIPOS = ['pre-teste', 'pos-teste', 'prova', 'simulacao', 'prova-video', 'simulado-evolutivo'];

function validateImportPayload(data: unknown): { valid: boolean; errors: string[]; payload?: ImportPayload } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['JSON invalido: deve ser um objeto.'] };
  }

  const obj = data as Record<string, unknown>;

  // Support both { avaliacoes: [...] } and single avaliacao object
  let avaliacoes: unknown[];
  if (Array.isArray(obj.avaliacoes)) {
    avaliacoes = obj.avaliacoes;
  } else if (obj.name && obj.tipo) {
    // Single avaliacao at root level
    avaliacoes = [obj];
  } else {
    return { valid: false, errors: ['JSON deve conter "avaliacoes" (array) ou ser uma avaliacao unica com "name" e "tipo".'] };
  }

  if (avaliacoes.length === 0) {
    return { valid: false, errors: ['Array de avaliacoes esta vazio.'] };
  }

  if (avaliacoes.length > 50) {
    return { valid: false, errors: ['Maximo de 50 avaliacoes por importacao.'] };
  }

  for (let i = 0; i < avaliacoes.length; i++) {
    const av = avaliacoes[i] as Record<string, unknown>;
    const prefix = `Avaliacao[${i}]`;

    if (!av || typeof av !== 'object') {
      errors.push(`${prefix}: deve ser um objeto.`);
      continue;
    }

    if (!av.name || typeof av.name !== 'string' || av.name.trim().length < 3) {
      errors.push(`${prefix}: "name" obrigatorio (min 3 caracteres).`);
    }

    if (!av.tipo || typeof av.tipo !== 'string' || !VALID_TIPOS.includes(av.tipo)) {
      errors.push(`${prefix}: "tipo" deve ser: ${VALID_TIPOS.join(', ')}.`);
    }

    // Validate questoes if present
    if (av.questoes && Array.isArray(av.questoes)) {
      for (let j = 0; j < (av.questoes as unknown[]).length; j++) {
        const q = (av.questoes as Record<string, unknown>[])[j];
        const qPrefix = `${prefix}.questoes[${j}]`;

        if (!q || typeof q !== 'object') {
          errors.push(`${qPrefix}: deve ser um objeto.`);
          continue;
        }

        if (!q.enunciado || typeof q.enunciado !== 'string' || (q.enunciado as string).trim().length < 5) {
          errors.push(`${qPrefix}: "enunciado" obrigatorio (min 5 caracteres).`);
        }

        const isEvolutivo = av.tipo === 'simulado-evolutivo';

        if (!isEvolutivo) {
          if (!q.tipo || !['multipla', 'discursiva'].includes(q.tipo as string)) {
            errors.push(`${qPrefix}: "tipo" deve ser "multipla" ou "discursiva".`);
          }

          if (q.tipo === 'multipla') {
            if (!Array.isArray(q.alternativas) || (q.alternativas as unknown[]).length < 2) {
              errors.push(`${qPrefix}: questao multipla precisa de pelo menos 2 alternativas.`);
            }
            if (!q.gabarito || typeof q.gabarito !== 'string') {
              errors.push(`${qPrefix}: questao multipla precisa de gabarito.`);
            }
          }
        } else {
          // Evolutivo: needs questaoIdRef and alternativasEvolutivas
          if (!q.questaoIdRef || typeof q.questaoIdRef !== 'string') {
            errors.push(`${qPrefix}: questao evolutiva precisa de "questaoIdRef".`);
          }
          if (!Array.isArray(q.alternativasEvolutivas) || (q.alternativasEvolutivas as unknown[]).length < 1) {
            errors.push(`${qPrefix}: questao evolutiva precisa de pelo menos 1 alternativaEvolutiva.`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    payload: { avaliacoes: avaliacoes as ImportAvaliacao[] },
  };
}

// ---------------------------------------------------------------------------
// POST /api/avaliacoes/import-json
// Import assessments from JSON with auto-creation of courses
// ---------------------------------------------------------------------------

export const POST = withAdmin(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    const body = await req.json();
    const { mode = 'import' } = body as { mode?: string };
    const data = body.data || body;

    // Validate
    const validation = validateImportPayload(data);

    if (mode === 'validate') {
      return NextResponse.json({
        valid: validation.valid,
        errors: validation.errors,
        totalAvaliacoes: validation.payload?.avaliacoes.length || 0,
        preview: validation.payload?.avaliacoes.map((av) => ({
          name: av.name,
          tipo: av.tipo,
          curso: av.curso?.name || null,
          questoes: av.questoes?.length || 0,
        })) || [],
      });
    }

    if (!validation.valid || !validation.payload) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Dados de importacao invalidos.',
          errors: validation.errors,
        },
        { status: 400 },
      );
    }

    await connectDB();

    const userId = req.user.userId;
    const results: Array<{
      name: string;
      tipo: string;
      protocolId: string;
      questoes: number;
      cursoCreated: boolean;
      cursoName: string | null;
    }> = [];

    // Cache for courses: cursoName → cursoId (avoid duplicates)
    const cursoCache = new Map<string, string>();

    // Pre-load existing courses into cache
    const existingCursos = await Curso.find({ isActive: true }).select('name _id').lean();
    for (const c of existingCursos) {
      cursoCache.set(c.name.toLowerCase().trim(), c._id.toString());
    }

    // Cache for preTeste linking: protocolId → _id
    const preTesteCache = new Map<string, string>();
    const existingAvaliacoes = await Avaliacao.find({
      tipo: { $in: ['pre-teste'] },
    }).select('protocolId name _id').lean();
    for (const a of existingAvaliacoes) {
      preTesteCache.set(a.protocolId, a._id.toString());
      preTesteCache.set(a.name.toLowerCase().trim(), a._id.toString());
    }

    for (const avData of validation.payload.avaliacoes) {
      const isEvolutivo = avData.tipo === 'simulado-evolutivo';
      const isProvaVideo = avData.tipo === 'prova-video';

      // 1. Resolve or create course
      let cursoId: string | null = null;
      let cursoCreated = false;
      const cursoName = avData.curso?.name || null;

      if (avData.curso?.name) {
        const normalizedName = avData.curso.name.toLowerCase().trim();

        if (cursoCache.has(normalizedName)) {
          cursoId = cursoCache.get(normalizedName)!;
        } else {
          // Create new course
          const newCurso = await Curso.create({
            protocolId: generateProtocolId('curso'),
            name: avData.curso.name.trim(),
            description: avData.curso.description || `Curso importado: ${avData.curso.name}`,
            imageUrl: avData.curso.imageUrl || null,
            duracao: avData.curso.duracao || null,
            isActive: true,
            createdBy: userId,
          });
          cursoId = newCurso._id.toString();
          cursoCache.set(normalizedName, cursoId);
          cursoCreated = true;
        }
      }

      // 2. Resolve preTeste reference
      let preTesteId: string | null = null;
      if (avData.preTesteRef) {
        if (avData.preTesteRef.protocolId && preTesteCache.has(avData.preTesteRef.protocolId)) {
          preTesteId = preTesteCache.get(avData.preTesteRef.protocolId)!;
        } else if (avData.preTesteRef.name) {
          const normalizedPreTeste = avData.preTesteRef.name.toLowerCase().trim();
          if (preTesteCache.has(normalizedPreTeste)) {
            preTesteId = preTesteCache.get(normalizedPreTeste)!;
          }
        }
      }

      // 3. Create the Avaliacao
      const avaliacaoProtocolId = generateProtocolId('avaliacao');
      const configuracao = avData.configuracao || {
        alternativasPadrao: 'ABCDE',
        feedbackImediato: false,
        feedbackFinal: true,
        tempoLimiteMinutos: null,
        embaralharQuestoes: false,
        embaralharAlternativas: false,
        tentativasPermitidas: 1,
        acessoPublico: false,
      };

      const avaliacao = await Avaliacao.create({
        protocolId: avaliacaoProtocolId,
        name: avData.name.trim(),
        description: avData.description || '',
        tipo: avData.tipo,
        curso: cursoId || null,
        preTeste: preTesteId || null,
        configuracao,
        isActive: avData.isActive !== false,
        createdBy: userId,
        questoes: [],
        ...(isEvolutivo && avData.pacienteInicial ? { pacienteInicial: avData.pacienteInicial } : {}),
        ...(isProvaVideo ? {
          videoUrl: avData.videoUrl || null,
          legendaVideo: avData.legendaVideo || null,
          modoFinalizacao: avData.modoFinalizacao || 'ir-para-resultado',
        } : {}),
      });

      // 4. Create Questoes
      let questaoCount = 0;
      if (Array.isArray(avData.questoes) && avData.questoes.length > 0) {
        if (isEvolutivo) {
          // Evolutivo questions
          const questoesData = avData.questoes.map((q, idx) => ({
            avaliacao: avaliacao._id,
            tipo: 'multipla' as const,
            enunciado: q.enunciado,
            alternativas: [],
            gabarito: null,
            questaoIdRef: q.questaoIdRef || `q${idx + 1}`,
            contextoClinico: q.contextoClinico || null,
            isFinal: q.isFinal || false,
            alternativasEvolutivas: q.alternativasEvolutivas || [],
            imagemUrl: q.imagemUrl || null,
            videoUrl: q.videoUrl || null,
            ordem: q.ordem ?? idx,
            pontuacao: q.pontuacao ?? 1,
          }));

          const created = await Questao.insertMany(questoesData);
          questaoCount = created.length;

          await Avaliacao.findByIdAndUpdate(avaliacao._id, {
            $set: { questoes: created.map((q) => q._id) },
          });
        } else {
          // Standard / prova-video questions
          const questoesData = avData.questoes.map((q, idx) => ({
            avaliacao: avaliacao._id,
            tipo: q.tipo || 'multipla',
            enunciado: q.enunciado,
            alternativas: q.alternativas || [],
            gabarito: q.gabarito || null,
            respostaComentada: q.respostaComentada || null,
            fonteBibliografica: q.fonteBibliografica || null,
            imagemUrl: q.imagemUrl || null,
            videoUrl: q.videoUrl || null,
            ordem: q.ordem ?? idx,
            pontuacao: q.pontuacao ?? 1,
            // Encrypt videoId for prova-video
            ...(q.videoConfig?.videoId ? {
              videoConfig: {
                videoId: encryptIfNeeded(q.videoConfig.videoId),
                timestampParada: q.videoConfig.timestampParada,
                tempoResposta: q.videoConfig.tempoResposta,
              },
            } : {}),
          }));

          const created = await Questao.insertMany(questoesData);
          questaoCount = created.length;

          await Avaliacao.findByIdAndUpdate(avaliacao._id, {
            $set: { questoes: created.map((q) => q._id) },
          });
        }
      }

      // 5. Link to curso
      if (cursoId) {
        await Curso.findByIdAndUpdate(cursoId, {
          $addToSet: { avaliacoes: avaliacao._id },
        });
      }

      // Cache preTeste if this is one (for subsequent pós-teste imports)
      if (avData.tipo === 'pre-teste') {
        preTesteCache.set(avaliacaoProtocolId, avaliacao._id.toString());
        preTesteCache.set(avData.name.toLowerCase().trim(), avaliacao._id.toString());
      }

      results.push({
        name: avData.name,
        tipo: avData.tipo,
        protocolId: avaliacaoProtocolId,
        questoes: questaoCount,
        cursoCreated,
        cursoName,
      });
    }

    return NextResponse.json(
      {
        message: `Importacao concluida: ${results.length} avaliacao(oes) criada(s).`,
        results,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/avaliacoes/import-json] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao importar avaliacoes.', details: String(error) },
      { status: 500 },
    );
  }
});
