import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Questao from '@/lib/db/models/Questao';
import { withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { parseTxt } from '@/lib/import/parseTxt';
import type { ParsedQuestaoStandard, ParsedQuestaoVideo, ParsedQuestaoEvolutiva } from '@/lib/import/types';

// ---------------------------------------------------------------------------
// POST /api/avaliacoes/import - Import questions from TXT into an avaliação
// ---------------------------------------------------------------------------

export const POST = withAdmin(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    const body = await req.json();
    const { avaliacaoId, txtContent, mode } = body as {
      avaliacaoId: string;
      txtContent: string;
      mode: 'validate' | 'import';
    };

    if (!avaliacaoId || !txtContent) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'avaliacaoId e txtContent são obrigatórios.' },
        { status: 400 },
      );
    }

    await connectDB();

    // Fetch avaliação
    const avaliacao = await Avaliacao.findById(avaliacaoId);
    if (!avaliacao) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Avaliação não encontrada.' },
        { status: 404 },
      );
    }

    // Parse the TXT content
    const parseResult = parseTxt(txtContent, avaliacao.tipo);

    // If validate-only mode, return parse result without saving
    if (mode === 'validate') {
      return NextResponse.json({
        success: parseResult.success,
        totalBlocks: parseResult.totalBlocks,
        questoesParsed: parseResult.questoes.length,
        errors: parseResult.errors,
        preview: parseResult.questoes.map((q, i) => {
          if (q.kind === 'evolutiva') {
            return {
              index: i + 1,
              kind: q.kind,
              questaoIdRef: q.questaoIdRef,
              enunciado: q.enunciado.substring(0, 100) + (q.enunciado.length > 100 ? '...' : ''),
              alternativas: q.alternativasEvolutivas.length,
              isFinal: q.isFinal,
            };
          }
          return {
            index: i + 1,
            kind: q.kind,
            tipo: q.tipo,
            enunciado: q.enunciado.substring(0, 100) + (q.enunciado.length > 100 ? '...' : ''),
            alternativas: q.alternativas.length,
            gabarito: q.gabarito,
          };
        }),
      });
    }

    // Import mode: only proceed if no errors
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'PARSE_ERROR',
          message: 'O arquivo contém erros. Corrija-os antes de importar.',
          errors: parseResult.errors,
        },
        { status: 400 },
      );
    }

    const isEvolutivo = avaliacao.tipo === 'simulado-evolutivo';

    // Create Questao documents
    let createdQuestoes;
    const existingCount = avaliacao.questoes?.length || 0;

    if (isEvolutivo) {
      const evolutivas = parseResult.questoes as ParsedQuestaoEvolutiva[];
      createdQuestoes = await Questao.insertMany(
        evolutivas.map((q, i) => ({
          avaliacao: avaliacao._id,
          tipo: 'multipla' as const,
          enunciado: q.enunciado,
          alternativas: [],
          gabarito: null,
          questaoIdRef: q.questaoIdRef,
          contextoClinico: q.contextoClinico ? { atualizacao: q.contextoClinico, vitaisAtuais: null } : null,
          isFinal: q.isFinal,
          alternativasEvolutivas: q.alternativasEvolutivas.map((alt) => ({
            id: alt.id,
            texto: alt.texto,
            tipo: alt.tipo,
            valor: alt.valor,
            proximaQuestao: alt.proximaQuestao || null,
            impactoNoSinaisVitais: alt.impactoNoSinaisVitais || null,
            impactoNoECG: null,
            impactoNoStatus: alt.impactoNoStatus || null,
            retroalimentacao: alt.retroalimentacao || '',
          })),
          imagemUrl: q.imagemUrl || null,
          videoUrl: q.videoUrl || null,
          ordem: existingCount + i + 1,
          pontuacao: q.pontuacao,
        })),
      );
    } else {
      const standards = parseResult.questoes as (ParsedQuestaoStandard | ParsedQuestaoVideo)[];
      createdQuestoes = await Questao.insertMany(
        standards.map((q, i) => ({
          avaliacao: avaliacao._id,
          tipo: q.tipo,
          enunciado: q.enunciado,
          alternativas: q.alternativas,
          gabarito: q.gabarito || null,
          respostaComentada: q.respostaComentada || null,
          fonteBibliografica: q.fonteBibliografica || null,
          videoConfig: q.kind === 'video' ? q.videoConfig : null,
          imagemUrl: q.imagemUrl || null,
          videoUrl: q.videoUrl || null,
          ordem: existingCount + i + 1,
          pontuacao: q.pontuacao,
        })),
      );
    }

    // Add new question IDs to the avaliação
    const newIds = createdQuestoes.map((q) => q._id);
    await Avaliacao.findByIdAndUpdate(avaliacao._id, {
      $push: { questoes: { $each: newIds } },
    });

    return NextResponse.json({
      success: true,
      message: `${createdQuestoes.length} questões importadas com sucesso.`,
      imported: createdQuestoes.length,
      totalQuestoes: existingCount + createdQuestoes.length,
    });
  } catch (error) {
    console.error('[POST /api/avaliacoes/import] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao importar questões.' },
      { status: 500 },
    );
  }
});
