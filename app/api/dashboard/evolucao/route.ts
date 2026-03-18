import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Tentativa from '@/lib/db/models/Tentativa';
import Curso from '@/lib/db/models/Curso';
import { withAuth, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';

// Force model registration for populate
void Curso;

// ---------------------------------------------------------------------------
// GET /api/dashboard/evolucao — Pre-test vs Post-test evolution data
// Returns an array of { curso, preTeste, posTeste } for linked assessments
// where the current user has completed both.
// ---------------------------------------------------------------------------

export const GET = withAuth(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    await connectDB();

    const userId = req.user.userId;

    // 1. Find all pos-teste avaliacoes that have a linked preTeste
    const posTestesWithPre = await Avaliacao.find({
      tipo: 'pos-teste',
      preTeste: { $ne: null },
      isActive: true,
    })
      .populate('curso', 'name')
      .populate('preTeste', 'name')
      .lean();

    if (posTestesWithPre.length === 0) {
      return NextResponse.json({ evolucao: [] }, { status: 200 });
    }

    // 2. For each pair, find the user's latest finalized tentativa for both
    const evolucao: Array<{ curso: string; preTeste: number; posTeste: number }> = [];

    for (const posTesteAv of posTestesWithPre) {
      const preTesteId = posTesteAv.preTeste;
      if (!preTesteId) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preTesteRef = preTesteId as any;
      const preTesteObjectId = preTesteRef._id || preTesteRef;

      // Find user's latest finalized tentativa for pre-teste
      const preTentativa = await Tentativa.findOne({
        user: userId,
        avaliacao: preTesteObjectId,
        status: 'finalizada',
      })
        .sort({ finalizadaEm: -1 })
        .lean();

      // Find user's latest finalized tentativa for pos-teste
      const posTentativa = await Tentativa.findOne({
        user: userId,
        avaliacao: posTesteAv._id,
        status: 'finalizada',
      })
        .sort({ finalizadaEm: -1 })
        .lean();

      // Only include if both have been completed
      if (preTentativa && posTentativa) {
        // Get a label for the chart
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cursoObj = posTesteAv.curso as any;
        const cursoName = cursoObj?.name
          || posTesteAv.name
          || 'Avaliação';

        evolucao.push({
          curso: cursoName,
          preTeste: preTentativa.percentualAcerto ?? 0,
          posTeste: posTentativa.percentualAcerto ?? 0,
        });
      }
    }

    return NextResponse.json({ evolucao }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/dashboard/evolucao] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar evolucao.' },
      { status: 500 },
    );
  }
});
