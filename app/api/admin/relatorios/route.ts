import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Questao from '@/lib/db/models/Questao';
import Tentativa from '@/lib/db/models/Tentativa';
import Resposta from '@/lib/db/models/Resposta';
import Curso from '@/lib/db/models/Curso';
import User from '@/lib/db/models/User';
import { withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';

// Force model registration
void Questao;
void User;
void Curso;

// ---------------------------------------------------------------------------
// GET /api/admin/relatorios?avaliacaoId=X  — Report for a single avaliação
// GET /api/admin/relatorios?cursoId=X      — Report for an entire curso
// GET /api/admin/relatorios?userId=X       — Report for a single user
// ---------------------------------------------------------------------------

export const GET = withAdmin(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const avaliacaoId = searchParams.get('avaliacaoId');
    const cursoId = searchParams.get('cursoId');
    const userId = searchParams.get('userId');

    // ---- Report by Avaliação ----
    if (avaliacaoId) {
      const avaliacao = await Avaliacao.findById(avaliacaoId)
        .populate('curso', 'name')
        .populate({ path: 'questoes', options: { sort: { ordem: 1 } } })
        .lean();

      if (!avaliacao) {
        return NextResponse.json({ error: 'NOT_FOUND', message: 'Avaliação não encontrada.' }, { status: 404 });
      }

      // Get all finalized attempts for this avaliação
      const tentativas = await Tentativa.find({ avaliacao: avaliacaoId, status: 'finalizada' })
        .populate('user', 'name email crm')
        .sort({ finalizadaEm: -1 })
        .lean();

      // Get all respostas for these tentativas
      const tentativaIds = tentativas.map((t) => t._id);
      const respostas = await Resposta.find({ tentativa: { $in: tentativaIds } }).lean();

      // Build per-question stats
      // After populate + lean, questoes are plain objects (not ObjectIds)
      const questoes = (avaliacao.questoes || []) as unknown as Array<Record<string, unknown>>;
      const questionStats = questoes.map((q) => {
        const qId = (q._id as string)?.toString();
        const qRespostas = respostas.filter((r) => r.questao?.toString() === qId);
        const corretas = qRespostas.filter((r) => r.correta === true).length;
        const total = qRespostas.length;

        // Distribution of selected alternatives
        const distribuicao: Record<string, number> = {};
        for (const r of qRespostas) {
          const alt = r.alternativaSelecionada || 'sem_resposta';
          distribuicao[alt] = (distribuicao[alt] || 0) + 1;
        }

        return {
          questaoId: qId,
          ordem: q.ordem,
          enunciado: (q.enunciado as string)?.substring(0, 120) || '',
          tipo: q.tipo,
          gabarito: q.gabarito,
          totalRespostas: total,
          totalCorretas: corretas,
          taxaAcerto: total > 0 ? Math.round((corretas / total) * 100) : 0,
          distribuicao,
        };
      });

      // General stats
      const totalTentativas = tentativas.length;
      const scores = tentativas.map((t) => t.percentualAcerto || 0);
      const avgScore = totalTentativas > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalTentativas) : 0;
      const minScore = scores.length > 0 ? Math.min(...scores) : 0;
      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

      // Build user results table
      const userResults = tentativas.map((t) => {
        const u = t.user as unknown as Record<string, unknown>;
        return {
          tentativaId: t._id?.toString(),
          protocolId: t.protocolId,
          userName: u?.name || 'N/A',
          userEmail: u?.email || 'N/A',
          userCrm: u?.crm || '',
          pontuacaoObtida: t.pontuacaoObtida || 0,
          pontuacaoTotal: t.pontuacaoTotal || 0,
          percentualAcerto: t.percentualAcerto || 0,
          duracaoSegundos: t.duracaoSegundos || 0,
          finalizadaEm: t.finalizadaEm,
        };
      });

      return NextResponse.json({
        tipo: 'avaliacao',
        avaliacao: {
          _id: avaliacao._id,
          name: avaliacao.name,
          tipo: avaliacao.tipo,
          cursoName: (avaliacao.curso as unknown as Record<string, unknown>)?.name || null,
          totalQuestoes: questoes.length,
        },
        stats: {
          totalTentativas,
          avgScore,
          minScore,
          maxScore,
        },
        questionStats,
        userResults,
      });
    }

    // ---- Report by Curso ----
    if (cursoId) {
      const curso = await Curso.findById(cursoId)
        .populate({
          path: 'avaliacoes',
          match: { isActive: true },
          select: 'name tipo questoes',
        })
        .lean();

      if (!curso) {
        return NextResponse.json({ error: 'NOT_FOUND', message: 'Curso não encontrado.' }, { status: 404 });
      }

      const avaliacoesDoCurso = (curso.avaliacoes || []) as unknown as Array<Record<string, unknown>>;
      const avaliacaoIds = avaliacoesDoCurso.map((a) => String(a._id));

      // Get all finalized attempts for all avaliacoes in this curso
      const tentativas = await Tentativa.find({
        avaliacao: { $in: avaliacaoIds },
        status: 'finalizada',
      })
        .populate('user', 'name email crm')
        .populate('avaliacao', 'name tipo')
        .sort({ finalizadaEm: -1 })
        .lean();

      // Aggregate per-user stats
      const userMap: Record<string, {
        name: string; email: string; crm: string;
        tentativas: number; totalAcerto: number; avaliacoes: Set<string>;
      }> = {};

      for (const t of tentativas) {
        const u = t.user as unknown as Record<string, unknown>;
        const uId = (u?._id as string)?.toString() || 'unknown';
        if (!userMap[uId]) {
          userMap[uId] = {
            name: (u?.name as string) || 'N/A',
            email: (u?.email as string) || 'N/A',
            crm: (u?.crm as string) || '',
            tentativas: 0,
            totalAcerto: 0,
            avaliacoes: new Set(),
          };
        }
        userMap[uId].tentativas++;
        userMap[uId].totalAcerto += (t.percentualAcerto || 0);
        const avId = (t.avaliacao as unknown as Record<string, unknown>)?._id?.toString() || '';
        if (avId) userMap[uId].avaliacoes.add(avId);
      }

      const userStats = Object.entries(userMap).map(([userId, u]) => ({
        userId,
        name: u.name,
        email: u.email,
        crm: u.crm,
        tentativasTotal: u.tentativas,
        mediaAcerto: u.tentativas > 0 ? Math.round(u.totalAcerto / u.tentativas) : 0,
        avaliacoesRealizadas: u.avaliacoes.size,
      }));

      // Per-avaliacao summary
      const avaliacaoSummary = avaliacoesDoCurso.map((av) => {
        const avId = av._id?.toString();
        const avTentativas = tentativas.filter((t) => {
          const tAvId = (t.avaliacao as unknown as Record<string, unknown>)?._id?.toString();
          return tAvId === avId;
        });
        const scores = avTentativas.map((t) => t.percentualAcerto || 0);
        return {
          _id: avId,
          name: av.name,
          tipo: av.tipo,
          totalQuestoes: (av.questoes as unknown[])?.length || 0,
          totalTentativas: avTentativas.length,
          avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        };
      });

      const allScores = tentativas.map((t) => t.percentualAcerto || 0);
      const totalTentativas = tentativas.length;

      return NextResponse.json({
        tipo: 'curso',
        curso: {
          _id: curso._id,
          name: curso.name,
          totalAvaliacoes: avaliacoesDoCurso.length,
        },
        stats: {
          totalTentativas,
          totalUsuarios: Object.keys(userMap).length,
          avgScore: totalTentativas > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / totalTentativas) : 0,
          minScore: allScores.length > 0 ? Math.min(...allScores) : 0,
          maxScore: allScores.length > 0 ? Math.max(...allScores) : 0,
        },
        avaliacaoSummary,
        userStats,
      });
    }

    // ---- Report by User ----
    if (userId) {
      const user = await User.findById(userId).select('name email crm').lean();
      if (!user) {
        return NextResponse.json({ error: 'NOT_FOUND', message: 'Usuário não encontrado.' }, { status: 404 });
      }

      const tentativas = await Tentativa.find({ user: userId, status: 'finalizada' })
        .populate('avaliacao', 'name tipo curso')
        .sort({ finalizadaEm: -1 })
        .lean();

      const results = tentativas.map((t) => {
        const av = t.avaliacao as unknown as Record<string, unknown>;
        return {
          tentativaId: t._id?.toString(),
          protocolId: t.protocolId,
          avaliacaoName: av?.name || 'N/A',
          avaliacaoTipo: av?.tipo || 'N/A',
          pontuacaoObtida: t.pontuacaoObtida || 0,
          pontuacaoTotal: t.pontuacaoTotal || 0,
          percentualAcerto: t.percentualAcerto || 0,
          duracaoSegundos: t.duracaoSegundos || 0,
          finalizadaEm: t.finalizadaEm,
        };
      });

      const scores = tentativas.map((t) => t.percentualAcerto || 0);

      return NextResponse.json({
        tipo: 'usuario',
        user: { _id: user._id, name: user.name, email: user.email, crm: user.crm },
        stats: {
          totalTentativas: tentativas.length,
          avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
          minScore: scores.length > 0 ? Math.min(...scores) : 0,
          maxScore: scores.length > 0 ? Math.max(...scores) : 0,
        },
        results,
      });
    }

    return NextResponse.json({ error: 'BAD_REQUEST', message: 'Informe avaliacaoId, cursoId ou userId.' }, { status: 400 });
  } catch (error) {
    console.error('[GET /api/admin/relatorios] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao gerar relatorio.' },
      { status: 500 },
    );
  }
});
