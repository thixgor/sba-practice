import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Tentativa from '@/lib/db/models/Tentativa';
import Resposta from '@/lib/db/models/Resposta';
import Questao from '@/lib/db/models/Questao';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAuth, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { getClientIP } from '@/lib/security/rateLimit';

// ---------------------------------------------------------------------------
// Helper: extract and validate the [id] param (avaliacao ID)
// ---------------------------------------------------------------------------

async function extractId(ctx: RouteContext): Promise<string | null> {
  const params = ctx.params ? await ctx.params : undefined;
  const id = params?.id;
  if (!id || typeof id !== 'string') return null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return id;
}

// ---------------------------------------------------------------------------
// POST /api/avaliacoes/[id]/finalizar - Finalize an evaluation attempt
// ---------------------------------------------------------------------------

export const POST = withAuth(async (req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    const avaliacaoId = await extractId(ctx);
    if (!avaliacaoId) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de avaliacao invalido.' },
        { status: 400 },
      );
    }

    await connectDB();

    // 1. Find the active tentativa for this user and avaliacao
    const tentativa = await Tentativa.findOne({
      user: req.user.userId,
      avaliacao: avaliacaoId,
      status: 'em-andamento',
    });

    if (!tentativa) {
      return NextResponse.json(
        { error: 'NO_ACTIVE_ATTEMPT', message: 'Nenhuma tentativa em andamento encontrada.' },
        { status: 404 },
      );
    }

    // 2. Load all respostas for this tentativa
    const respostas = await Resposta.find({ tentativa: tentativa._id }).lean();

    // 3. Load all questions for this avaliacao to calculate the score server-side
    const questoes = await Questao.find({ avaliacao: avaliacaoId }).lean();

    // Load avaliacao to check type
    const avaliacao = await Avaliacao.findById(avaliacaoId).lean();
    const isEvolutivo = avaliacao?.tipo === 'simulado-evolutivo';

    // 4. Calculate score SERVER-SIDE (never trust client)
    let pontuacaoObtida = 0;
    let pontuacaoTotal = 0;

    if (isEvolutivo) {
      // For simulado-evolutivo: score = sum of valorObtido / sum of max valor per answered question
      for (const resposta of respostas) {
        const questao = questoes.find(
          (q) => q._id.toString() === resposta.questao.toString(),
        );
        if (!questao) continue;

        // Max possible valor for this question
        const maxValor = Math.max(
          ...(questao.alternativasEvolutivas || []).map((a: any) => (a.valor as number) || 0),
        );
        pontuacaoTotal += maxValor;
        pontuacaoObtida += (resposta.valorObtido as number) || 0;
      }
      // Fallback: if no respostas or all zero max, use question count
      if (pontuacaoTotal === 0) {
        pontuacaoTotal = questoes.length * 100;
      }
    } else {
      // Standard scoring
      pontuacaoTotal = questoes.reduce((sum, q) => sum + (q.pontuacao || 1), 0);

      for (const resposta of respostas) {
        const questao = questoes.find(
          (q) => q._id.toString() === resposta.questao.toString(),
        );
        if (!questao) continue;

        if (questao.tipo === 'multipla' && questao.gabarito) {
          if (resposta.alternativaSelecionada === questao.gabarito) {
            pontuacaoObtida += questao.pontuacao || 1;
          }
        }
      }
    }

    // 5. Calculate percentage and duration
    const finalizadaEm = new Date();
    const duracaoSegundos = Math.floor(
      (finalizadaEm.getTime() - new Date(tentativa.iniciadaEm).getTime()) / 1000,
    );
    const percentualAcerto = pontuacaoTotal > 0
      ? Math.round((pontuacaoObtida / pontuacaoTotal) * 10000) / 100
      : 0;

    // 6. Update the tentativa with final results
    tentativa.status = 'finalizada';
    tentativa.finalizadaEm = finalizadaEm;
    tentativa.duracaoSegundos = duracaoSegundos;
    tentativa.pontuacaoTotal = pontuacaoTotal;
    tentativa.pontuacaoObtida = pontuacaoObtida;
    tentativa.percentualAcerto = percentualAcerto;
    await tentativa.save();

    // 7. Audit log
    const ip = getClientIP(req);
    await AuditLog.create({
      user: req.user.userId,
      action: 'tentativa_finalized',
      resource: 'tentativa',
      resourceId: tentativa._id.toString(),
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || null,
      metadata: {
        avaliacaoId,
        pontuacaoObtida,
        pontuacaoTotal,
        percentualAcerto,
        duracaoSegundos,
        totalRespostas: respostas.length,
        totalQuestoes: questoes.length,
        tipo: avaliacao?.tipo,
      },
    });

    // 8. Build detailed result with per-question breakdown
    if (isEvolutivo) {
      // Evolutivo-specific result details
      const detalhes = questoes
        .filter((q) => respostas.some((r) => r.questao.toString() === q._id.toString()))
        .map((q) => {
          const resposta = respostas.find(
            (r) => r.questao.toString() === q._id.toString(),
          );
          const altEscolhida = (q.alternativasEvolutivas || []).find(
            (a: any) => a.id === resposta?.alternativaEvolutivaId,
          );
          return {
            questaoId: q._id.toString(),
            questaoIdRef: q.questaoIdRef,
            enunciado: q.enunciado,
            contextoClinico: q.contextoClinico,
            respondida: true,
            alternativaEvolutivaId: resposta?.alternativaEvolutivaId || null,
            alternativaTexto: (altEscolhida?.texto as string) || null,
            tipoResposta: resposta?.tipoResposta || null,
            valorObtido: resposta?.valorObtido ?? 0,
            maxValor: Math.max(
              ...(q.alternativasEvolutivas || []).map((a: any) => (a.valor as number) || 0),
            ),
            retroalimentacao: (altEscolhida?.retroalimentacao as string) || null,
            alternativasEvolutivas: (q.alternativasEvolutivas || []).map(
              (a: any) => ({
                id: a.id,
                texto: a.texto,
                tipo: a.tipo,
                valor: a.valor,
              }),
            ),
          };
        });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const estadoFinal = (tentativa as any).estadoPaciente || null;

      return NextResponse.json(
        {
          resultado: {
            tentativaId: tentativa._id.toString(),
            protocolId: tentativa.protocolId,
            status: 'finalizada',
            pontuacaoObtida,
            pontuacaoTotal,
            percentualAcerto,
            duracaoSegundos,
            iniciadaEm: tentativa.iniciadaEm,
            finalizadaEm,
            totalQuestoes: questoes.length,
            totalRespondidas: respostas.length,
            tipo: 'simulado-evolutivo',
          },
          detalhes,
          pacienteInicial: avaliacao?.pacienteInicial || null,
          estadoFinal,
        },
        { status: 200 },
      );
    }

    // Standard result details
    const detalhes = questoes.map((q) => {
      const resposta = respostas.find(
        (r) => r.questao.toString() === q._id.toString(),
      );
      return {
        questaoId: q._id.toString(),
        enunciado: q.enunciado,
        tipo: q.tipo,
        alternativas: q.alternativas,
        respondida: !!resposta,
        alternativaSelecionada: resposta?.alternativaSelecionada || null,
        respostaDiscursiva: resposta?.respostaDiscursiva || null,
        correta: resposta?.correta ?? null,
        gabarito: q.gabarito,
        respostaComentada: q.respostaComentada || null,
        fonteBibliografica: q.fonteBibliografica || null,
        pontuacao: q.pontuacao || 1,
      };
    });

    return NextResponse.json(
      {
        resultado: {
          tentativaId: tentativa._id.toString(),
          protocolId: tentativa.protocolId,
          status: 'finalizada',
          pontuacaoObtida,
          pontuacaoTotal,
          percentualAcerto,
          duracaoSegundos,
          iniciadaEm: tentativa.iniciadaEm,
          finalizadaEm,
          totalQuestoes: questoes.length,
          totalRespondidas: respostas.length,
        },
        detalhes,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[POST /api/avaliacoes/[id]/finalizar] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao finalizar avaliacao.' },
      { status: 500 },
    );
  }
});
