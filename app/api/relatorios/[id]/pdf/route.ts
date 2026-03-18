import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongoose';
import Tentativa from '@/lib/db/models/Tentativa';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Questao from '@/lib/db/models/Questao';
import Resposta from '@/lib/db/models/Resposta';
import User from '@/lib/db/models/User';
import { withAuth, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';

// ---------------------------------------------------------------------------
// Helper: extract and validate the [id] param
// ---------------------------------------------------------------------------

async function extractId(ctx: RouteContext): Promise<string | null> {
  const params = ctx.params ? await ctx.params : undefined;
  const id = params?.id;
  if (!id || typeof id !== 'string') return null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return id;
}

// ---------------------------------------------------------------------------
// GET /api/relatorios/[id]/pdf
// Returns JSON data needed to generate a PDF report client-side
// (PDF is generated client-side with jsPDF to avoid serverless timeouts)
// ---------------------------------------------------------------------------

export const GET = withAuth(async (req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    const id = await extractId(ctx);
    if (!id) {
      return NextResponse.json({ error: 'Invalid attempt ID' }, { status: 400 });
    }

    await dbConnect();

    // Find the tentativa
    const tentativa = await Tentativa.findById(id).lean() as any;
    if (!tentativa) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }

    // Only allow the owner or admin to access the report
    if (
      tentativa.user.toString() !== req.user.userId &&
      req.user.role !== 'admin'
    ) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch related data
    const [avaliacao, questoes, respostas, userData] = await Promise.all([
      Avaliacao.findById(tentativa.avaliacao).lean() as any,
      Questao.find({ avaliacao: tentativa.avaliacao }).sort({ ordem: 1 }).lean() as any,
      Resposta.find({ tentativa: id }).lean() as any,
      User.findById(tentativa.user).select('name email crm protocolId').lean() as any,
    ]);

    if (!avaliacao) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Check if gabarito should be revealed
    const now = new Date();
    const gabaritoLiberado =
      !avaliacao.configuracao?.dataLiberacaoGabarito ||
      new Date(avaliacao.configuracao.dataLiberacaoGabarito) <= now;

    // Build the response map
    const respostaMap = new Map<string, any>();
    for (const r of respostas) {
      respostaMap.set(r.questao.toString(), r);
    }

    // Build detailed question results
    const detalhes = questoes.map((q: any, index: number) => {
      const resposta = respostaMap.get(q._id.toString());
      return {
        numero: index + 1,
        enunciado: q.enunciado,
        tipo: q.tipo,
        alternativaSelecionada: resposta?.alternativaSelecionada || null,
        respostaDiscursiva: resposta?.respostaDiscursiva || null,
        correta: gabaritoLiberado ? (resposta?.correta ?? null) : null,
        gabarito: gabaritoLiberado ? q.gabarito : null,
        respostaComentada: gabaritoLiberado ? q.respostaComentada : null,
        fonteBibliografica: q.fonteBibliografica || null,
        alternativas: q.alternativas?.map((a: any) => ({
          letra: a.letra,
          texto: a.texto,
        })) || [],
      };
    });

    // Build the report data
    const reportData = {
      tentativa: {
        protocolId: tentativa.protocolId,
        iniciadaEm: tentativa.iniciadaEm,
        finalizadaEm: tentativa.finalizadaEm,
        duracaoSegundos: tentativa.duracaoSegundos,
        pontuacaoTotal: tentativa.pontuacaoTotal,
        pontuacaoObtida: tentativa.pontuacaoObtida,
        percentualAcerto: tentativa.percentualAcerto,
        status: tentativa.status,
      },
      avaliacao: {
        name: avaliacao.name,
        tipo: avaliacao.tipo,
        protocolId: avaliacao.protocolId,
      },
      usuario: {
        name: userData?.name || 'Usuário',
        email: userData?.email || '',
        crm: userData?.crm || null,
        protocolId: userData?.protocolId || '',
      },
      detalhes,
      gabaritoLiberado,
      dataLiberacaoGabarito: avaliacao.configuracao?.dataLiberacaoGabarito || null,
      totalQuestoes: questoes.length,
      geradoEm: new Date().toISOString(),
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Report PDF data error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report data' },
      { status: 500 }
    );
  }
});
