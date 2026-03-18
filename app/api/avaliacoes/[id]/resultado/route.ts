import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Tentativa from '@/lib/db/models/Tentativa';
import Resposta from '@/lib/db/models/Resposta';
import Questao from '@/lib/db/models/Questao';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Curso from '@/lib/db/models/Curso';
import { withAuth, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';

// Force model registration for populate
void Questao;
void Avaliacao;
void Curso;

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
// GET /api/avaliacoes/[id]/resultado?tentativaId=X
// Returns the user's latest finalized tentativa (or a specific one by tentativaId)
// with full question details for display on the resultado page.
// ---------------------------------------------------------------------------

export const GET = withAuth(async (req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    const avaliacaoId = await extractId(ctx);
    if (!avaliacaoId) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de avaliacao invalido.' },
        { status: 400 },
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const tentativaId = searchParams.get('tentativaId');

    // Build query: user's finalized tentativa for this avaliacao
    const query: Record<string, unknown> = {
      user: req.user.userId,
      avaliacao: avaliacaoId,
      status: 'finalizada',
    };

    // If a specific tentativaId was provided, filter by it
    if (tentativaId && mongoose.Types.ObjectId.isValid(tentativaId)) {
      query._id = tentativaId;
    }

    // Find the tentativa (most recent finalized)
    const tentativa = await Tentativa.findOne(query)
      .sort({ finalizadaEm: -1 })
      .lean();

    if (!tentativa) {
      return NextResponse.json(
        { error: 'NO_RESULT', message: 'Nenhum resultado encontrado para esta avaliacao.' },
        { status: 404 },
      );
    }

    // Load the avaliacao for metadata
    const avaliacao = await Avaliacao.findById(avaliacaoId)
      .populate('curso', 'name')
      .lean();

    if (!avaliacao) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Avaliacao nao encontrada.' },
        { status: 404 },
      );
    }

    // Load all respostas for this tentativa
    const respostas = await Resposta.find({ tentativa: tentativa._id }).lean();

    // Load all questions for this avaliacao
    const questoes = await Questao.find({ avaliacao: avaliacaoId })
      .sort({ ordem: 1 })
      .lean();

    const isEvolutivo = avaliacao.tipo === 'simulado-evolutivo';

    // Get curso name if available
    const cursoObj = avaliacao.curso as unknown as Record<string, unknown> | null;
    const cursoName = cursoObj?.name as string | null;

    // ---------------------------------------------------------------
    // SIMULADO-EVOLUTIVO result
    // ---------------------------------------------------------------
    if (isEvolutivo) {
      const detalhes = questoes
        .filter((q) => respostas.some((r) => r.questao.toString() === q._id.toString()))
        .map((q, index) => {
          const resposta = respostas.find(
            (r) => r.questao.toString() === q._id.toString(),
          );
          const altEscolhida = (q.alternativasEvolutivas || []).find(
            (a: any) => a.id === resposta?.alternativaEvolutivaId,
          );
          return {
            questaoNumero: index + 1,
            questaoId: q._id.toString(),
            questaoIdRef: q.questaoIdRef,
            enunciado: q.enunciado || '',
            contextoClinico: q.contextoClinico,
            respondida: true,
            alternativaEvolutivaId: resposta?.alternativaEvolutivaId || null,
            alternativaTexto: (altEscolhida?.texto as string) || null,
            tipoResposta: resposta?.tipoResposta || null,
            valorObtido: resposta?.valorObtido ?? 0,
            maxValor: Math.max(
              ...(q.alternativasEvolutivas || []).map((a: any) => (a.valor as number) || 0),
            ),
            correta: resposta?.correta ?? false,
            retroalimentacao: (altEscolhida?.retroalimentacao as string) || null,
            alternativasEvolutivas: (q.alternativasEvolutivas || []).map(
              (a: any) => ({
                id: a.id,
                texto: a.texto,
                tipo: a.tipo,
                valor: a.valor,
              }),
            ),
            pontuacao: q.pontuacao || 1,
          };
        });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const estadoFinal = (tentativa as any).estadoPaciente || null;

      return NextResponse.json({
        tentativa: {
          _id: tentativa._id?.toString(),
          protocolId: tentativa.protocolId,
          pontuacaoObtida: tentativa.pontuacaoObtida || 0,
          pontuacaoTotal: tentativa.pontuacaoTotal || 0,
          percentualAcerto: tentativa.percentualAcerto || 0,
          duracaoSegundos: tentativa.duracaoSegundos || 0,
          iniciadaEm: tentativa.iniciadaEm,
          finalizadaEm: tentativa.finalizadaEm,
        },
        avaliacao: {
          _id: avaliacao._id?.toString(),
          name: avaliacao.name,
          tipo: avaliacao.tipo,
          cursoName: cursoName || null,
          configuracao: {
            feedbackFinal: avaliacao.configuracao?.feedbackFinal ?? true,
            dataLiberacaoGabarito: avaliacao.configuracao?.dataLiberacaoGabarito || null,
          },
        },
        detalhes,
        pacienteInicial: avaliacao.pacienteInicial || null,
        estadoFinal,
      });
    }

    // ---------------------------------------------------------------
    // STANDARD result
    // ---------------------------------------------------------------
    const detalhes = questoes.map((q, index) => {
      const resposta = respostas.find(
        (r) => r.questao.toString() === q._id.toString(),
      );

      let correta = false;
      if (q.tipo === 'multipla' && q.gabarito) {
        correta = resposta?.alternativaSelecionada === q.gabarito;
      }
      if (resposta && typeof resposta.correta === 'boolean') {
        correta = resposta.correta;
      }

      return {
        questaoNumero: index + 1,
        questaoId: q._id.toString(),
        enunciado: q.enunciado || '',
        tipo: q.tipo,
        alternativas: q.alternativas || [],
        respondida: !!resposta,
        alternativaSelecionada: resposta?.alternativaSelecionada || null,
        respostaDiscursiva: resposta?.respostaDiscursiva || null,
        correta,
        gabarito: q.gabarito || null,
        respostaComentada: q.respostaComentada || null,
        fonteBibliografica: q.fonteBibliografica || null,
        pontuacao: q.pontuacao || 1,
      };
    });

    return NextResponse.json({
      tentativa: {
        _id: tentativa._id?.toString(),
        protocolId: tentativa.protocolId,
        pontuacaoObtida: tentativa.pontuacaoObtida || 0,
        pontuacaoTotal: tentativa.pontuacaoTotal || 0,
        percentualAcerto: tentativa.percentualAcerto || 0,
        duracaoSegundos: tentativa.duracaoSegundos || 0,
        iniciadaEm: tentativa.iniciadaEm,
        finalizadaEm: tentativa.finalizadaEm,
      },
      avaliacao: {
        _id: avaliacao._id?.toString(),
        name: avaliacao.name,
        tipo: avaliacao.tipo,
        cursoName: cursoName || null,
        configuracao: {
          feedbackFinal: avaliacao.configuracao?.feedbackFinal ?? true,
          dataLiberacaoGabarito: avaliacao.configuracao?.dataLiberacaoGabarito || null,
        },
      },
      detalhes,
    });
  } catch (error) {
    console.error('[GET /api/avaliacoes/[id]/resultado] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar resultado.' },
      { status: 500 },
    );
  }
});
