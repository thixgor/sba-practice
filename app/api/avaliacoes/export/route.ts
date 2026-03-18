import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Questao from '@/lib/db/models/Questao';
import Curso from '@/lib/db/models/Curso';
import { withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { decryptIfNeeded } from '@/lib/utils/crypto';

// Force model registration
void Questao;
void Curso;

// ---------------------------------------------------------------------------
// GET /api/avaliacoes/export?ids=id1,id2  OR  ?all=true
// Export assessments as a portable JSON format (admin only)
// ---------------------------------------------------------------------------

export const GET = withAdmin(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const ids = searchParams.get('ids');
    const all = searchParams.get('all') === 'true';

    if (!ids && !all) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Informe ?ids=id1,id2 ou ?all=true' },
        { status: 400 },
      );
    }

    // Build query
    const filter: Record<string, unknown> = {};
    if (ids && !all) {
      const idList = ids.split(',').map((id) => id.trim()).filter(Boolean);
      if (idList.length === 0) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: 'Nenhum ID informado.' },
          { status: 400 },
        );
      }
      filter._id = { $in: idList };
    }

    // Fetch avaliacoes with populated curso and questoes
    const avaliacoes = await Avaliacao.find(filter)
      .populate('curso', 'name description imageUrl duracao')
      .populate('preTeste', 'name protocolId')
      .populate({
        path: 'questoes',
        options: { sort: { ordem: 1 } },
      })
      .lean();

    if (avaliacoes.length === 0) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Nenhuma avaliacao encontrada para exportar.' },
        { status: 404 },
      );
    }

    // Build portable export format
    const exportData = {
      _exportVersion: '1.0',
      _exportedAt: new Date().toISOString(),
      _exportedBy: req.user.email || req.user.userId,
      _totalAvaliacoes: avaliacoes.length,
      avaliacoes: avaliacoes.map((av) => {
        const curso = av.curso as unknown as {
          name: string;
          description: string;
          imageUrl?: string;
          duracao?: number;
        } | null;

        const preTeste = av.preTeste as unknown as {
          name: string;
          protocolId: string;
        } | null;

        // Map questoes to portable format (strip internal IDs)
        const questoes = (av.questoes as unknown as Array<Record<string, unknown>>).map((q, idx) => {
          const base: Record<string, unknown> = {
            tipo: q.tipo,
            enunciado: q.enunciado,
            alternativas: q.alternativas,
            gabarito: q.gabarito,
            respostaComentada: q.respostaComentada || null,
            fonteBibliografica: q.fonteBibliografica || null,
            imagemUrl: q.imagemUrl || null,
            videoUrl: q.videoUrl || null,
            ordem: q.ordem ?? idx,
            pontuacao: q.pontuacao ?? 1,
          };

          // Include videoConfig for prova-video (decrypt videoId for export)
          if (q.videoConfig) {
            const vc = q.videoConfig as { videoId: string; timestampParada: number; tempoResposta: number };
            base.videoConfig = {
              videoId: decryptIfNeeded(vc.videoId),
              timestampParada: vc.timestampParada,
              tempoResposta: vc.tempoResposta,
            };
          }

          // Include evolutivo fields
          if (q.questaoIdRef) base.questaoIdRef = q.questaoIdRef;
          if (q.contextoClinico) base.contextoClinico = q.contextoClinico;
          if (q.isFinal) base.isFinal = q.isFinal;
          if (Array.isArray(q.alternativasEvolutivas) && (q.alternativasEvolutivas as unknown[]).length > 0) {
            base.alternativasEvolutivas = q.alternativasEvolutivas;
          }

          return base;
        });

        return {
          name: av.name,
          description: av.description || '',
          tipo: av.tipo,
          protocolId: av.protocolId,
          configuracao: av.configuracao,
          isActive: av.isActive,
          // Curso info (name-based for portability)
          curso: curso ? {
            name: curso.name,
            description: curso.description || '',
            imageUrl: curso.imageUrl || null,
            duracao: curso.duracao || null,
          } : null,
          // Pre-teste reference (by name for portability)
          preTesteRef: preTeste ? {
            name: preTeste.name,
            protocolId: preTeste.protocolId,
          } : null,
          // Simulado evolutivo patient
          pacienteInicial: av.pacienteInicial || null,
          // Prova de video fields
          videoUrl: av.videoUrl || null,
          legendaVideo: av.legendaVideo || null,
          modoFinalizacao: av.modoFinalizacao || null,
          // Questions
          questoes,
        };
      }),
    };

    return NextResponse.json(exportData, { status: 200 });
  } catch (error) {
    console.error('[GET /api/avaliacoes/export] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao exportar avaliacoes.' },
      { status: 500 },
    );
  }
});
