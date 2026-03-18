import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Tentativa from '@/lib/db/models/Tentativa';
import Resposta from '@/lib/db/models/Resposta';
import Avaliacao from '@/lib/db/models/Avaliacao';
import { withAuth, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';

// Force model registration for populate
void Avaliacao;

// ---------------------------------------------------------------------------
// GET /api/tentativas — List current user's finalized tentativas (for /relatorios)
// ---------------------------------------------------------------------------

export const GET = withAuth(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    await connectDB();

    const tentativas = await Tentativa.find({
      user: req.user.userId,
      status: 'finalizada',
    })
      .populate('avaliacao', 'name tipo curso')
      .sort({ finalizadaEm: -1 })
      .lean();

    const result = tentativas.map((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const av = t.avaliacao as any;
      return {
        _id: t._id?.toString(),
        protocolId: t.protocolId,
        avaliacaoId: av?._id?.toString() || '',
        avaliacaoName: av?.name || 'Avaliação',
        tipo: av?.tipo || 'prova',
        percentualAcerto: t.percentualAcerto ?? 0,
        pontuacaoObtida: t.pontuacaoObtida ?? 0,
        pontuacaoTotal: t.pontuacaoTotal ?? 0,
        duracaoSegundos: t.duracaoSegundos ?? 0,
        finalizadaEm: t.finalizadaEm?.toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json({ tentativas: result }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/tentativas] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar tentativas.' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/tentativas — Delete ALL finalized tentativas for the current user
// This permanently removes all reports/history. There is no undo.
// ---------------------------------------------------------------------------

export const DELETE = withAuth(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    await connectDB();

    const userId = req.user.userId;

    // 1. Find all finalized tentativas for this user
    const tentativas = await Tentativa.find({
      user: userId,
      status: 'finalizada',
    }).select('_id').lean();

    if (tentativas.length === 0) {
      return NextResponse.json(
        { message: 'Nenhum relatorio para remover.', deleted: 0 },
        { status: 200 },
      );
    }

    const tentativaIds = tentativas.map((t) => t._id);

    // 2. Delete all Respostas linked to these tentativas
    const respostasResult = await Resposta.deleteMany({
      tentativa: { $in: tentativaIds },
    });

    // 3. Delete the tentativas themselves
    const tentativasResult = await Tentativa.deleteMany({
      _id: { $in: tentativaIds },
    });

    return NextResponse.json(
      {
        message: 'Relatorios removidos com sucesso.',
        deleted: tentativasResult.deletedCount,
        respostasRemoved: respostasResult.deletedCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[DELETE /api/tentativas] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao remover relatorios.' },
      { status: 500 },
    );
  }
});
