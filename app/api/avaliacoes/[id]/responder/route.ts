import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Tentativa from '@/lib/db/models/Tentativa';
import Questao from '@/lib/db/models/Questao';
import Resposta from '@/lib/db/models/Resposta';
import Avaliacao from '@/lib/db/models/Avaliacao';
import { withAuth, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { respostaSchema } from '@/lib/utils/validators';
import { sanitizeObject } from '@/lib/security/sanitize';

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
// POST /api/avaliacoes/[id]/responder - Submit an answer
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

    // 1. Parse and validate request body
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    const parsed = respostaSchema.safeParse(sanitizedBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Dados da resposta invalidos.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { questaoId, alternativaSelecionada, respostaDiscursiva, alternativaEvolutivaId } = parsed.data;

    await connectDB();

    // 2. Find the active tentativa for this user and avaliacao
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

    // 3. Check if time limit has expired (server-side enforcement)
    const avaliacao = await Avaliacao.findById(avaliacaoId).lean();
    if (avaliacao?.configuracao?.tempoLimiteMinutos) {
      const elapsedMs = Date.now() - new Date(tentativa.iniciadaEm).getTime();
      const limitMs = avaliacao.configuracao.tempoLimiteMinutos * 60 * 1000;
      if (elapsedMs > limitMs) {
        tentativa.status = 'expirada';
        tentativa.finalizadaEm = new Date();
        tentativa.duracaoSegundos = Math.floor(elapsedMs / 1000);
        await tentativa.save();

        return NextResponse.json(
          { error: 'TIME_EXPIRED', message: 'Tempo da avaliacao expirado.' },
          { status: 403 },
        );
      }
    }

    // 4. Find the question to validate the answer server-side
    const questao = await Questao.findById(questaoId).lean();

    if (!questao) {
      return NextResponse.json(
        { error: 'QUESTION_NOT_FOUND', message: 'Questao nao encontrada.' },
        { status: 404 },
      );
    }

    if (questao.avaliacao.toString() !== avaliacaoId) {
      return NextResponse.json(
        { error: 'INVALID_QUESTION', message: 'Esta questao nao pertence a esta avaliacao.' },
        { status: 400 },
      );
    }

    // 5. Check if already answered (prevent duplicates)
    const existingResposta = await Resposta.findOne({
      tentativa: tentativa._id,
      questao: questaoId,
    });

    if (existingResposta) {
      return NextResponse.json(
        { error: 'ALREADY_ANSWERED', message: 'Esta questao ja foi respondida nesta tentativa.' },
        { status: 409 },
      );
    }

    const isEvolutivo = avaliacao?.tipo === 'simulado-evolutivo';

    // Calculate response time
    const tempoResposta = body.tempoResposta
      ? Math.max(0, Number(body.tempoResposta))
      : null;

    // ---------------------------------------------------------------
    // SIMULADO-EVOLUTIVO answer path
    // ---------------------------------------------------------------
    if (isEvolutivo && alternativaEvolutivaId) {
      // Find the chosen alternative in the question
      const altEvolutiva = (questao.alternativasEvolutivas || []).find(
        (a: any) => a.id === alternativaEvolutivaId,
      );

      if (!altEvolutiva) {
        return NextResponse.json(
          { error: 'INVALID_ALTERNATIVE', message: 'Alternativa evolutiva nao encontrada.' },
          { status: 400 },
        );
      }

      // Determine "correctness": "Mais Correto" with highest valor = best choice
      const maxValor = Math.max(
        ...(questao.alternativasEvolutivas || []).map((a: any) => (a.valor as number) || 0),
      );
      const correta = (altEvolutiva.valor as number) === maxValor;

      // Create Resposta with evolutivo fields
      const resposta = await Resposta.create({
        tentativa: tentativa._id,
        questao: questaoId,
        user: req.user.userId,
        alternativaSelecionada: null,
        respostaDiscursiva: null,
        correta,
        tempoResposta,
        respondidaEm: new Date(),
        alternativaEvolutivaId,
        tipoResposta: altEvolutiva.tipo as string,
        valorObtido: altEvolutiva.valor as number,
      });

      // Apply impacts to patient state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const estadoAtual = (tentativa as any).estadoPaciente || {};
      const sinaisAtuais = estadoAtual.sinaisVitais || {};
      const ecgAtual = estadoAtual.ecg || {};

      // Apply vital signs impact (additive changes)
      if (altEvolutiva.impactoNoSinaisVitais) {
        const impacto = altEvolutiva.impactoNoSinaisVitais as Record<string, unknown>;
        if (impacto.frequenciaCardiaca != null) {
          sinaisAtuais.frequenciaCardiaca = (sinaisAtuais.frequenciaCardiaca || 80) + (impacto.frequenciaCardiaca as number);
        }
        if (impacto.pressaoArterial != null) {
          sinaisAtuais.pressaoArterial = impacto.pressaoArterial as string;
        }
        if (impacto.saturacaoOxigenio != null) {
          sinaisAtuais.saturacaoOxigenio = Math.min(100, Math.max(0,
            (sinaisAtuais.saturacaoOxigenio || 98) + (impacto.saturacaoOxigenio as number)));
        }
        if (impacto.frequenciaRespiratoria != null) {
          sinaisAtuais.frequenciaRespiratoria = (sinaisAtuais.frequenciaRespiratoria || 16) + (impacto.frequenciaRespiratoria as number);
        }
        if (impacto.temperatura != null) {
          sinaisAtuais.temperatura = (sinaisAtuais.temperatura || 36.5) + (impacto.temperatura as number);
        }
      }

      // Apply ECG impact (overwrite changed parameters)
      if (altEvolutiva.impactoNoECG) {
        const impactoECG = altEvolutiva.impactoNoECG as Record<string, unknown>;
        if (impactoECG.ondaP) ecgAtual.ondaP = impactoECG.ondaP;
        if (impactoECG.complexoQRS) ecgAtual.complexoQRS = impactoECG.complexoQRS;
        if (impactoECG.ondaT) ecgAtual.ondaT = impactoECG.ondaT;
        if (impactoECG.segmentoST) ecgAtual.segmentoST = impactoECG.segmentoST;
        if (impactoECG.status) ecgAtual.status = impactoECG.status;
      }

      // Apply status impact
      let statusPaciente = estadoAtual.statusPaciente || 'Estável';
      if (altEvolutiva.impactoNoStatus) {
        statusPaciente = altEvolutiva.impactoNoStatus as string;
      }

      // Add to history
      const historico = estadoAtual.historico || [];
      historico.push({
        texto: `Q${questao.questaoIdRef}: ${(altEvolutiva.texto as string || '').substring(0, 100)}`,
        timestamp: new Date(),
      });

      const updatedEstado = {
        sinaisVitais: sinaisAtuais,
        ecg: ecgAtual,
        statusPaciente,
        historico,
      };

      // Update tentativa: add resposta, track questoesRespondidas, update patient state
      await Tentativa.updateOne(
        { _id: tentativa._id },
        {
          $push: {
            respostas: resposta._id,
            questoesRespondidas: {
              questaoIdRef: questao.questaoIdRef,
              alternativaId: alternativaEvolutivaId,
            },
          },
          $inc: { currentQuestionIndex: 1 },
          $set: { estadoPaciente: updatedEstado },
        },
      );

      // Build response: always show feedback for evolutivo (retroalimentacao)
      const proximaQuestao = (altEvolutiva.proximaQuestao as string) || null;

      return NextResponse.json(
        {
          respostaId: resposta._id.toString(),
          questaoId,
          saved: true,
          // Evolutivo-specific feedback
          tipo: altEvolutiva.tipo,
          valor: altEvolutiva.valor,
          correta,
          retroalimentacao: altEvolutiva.retroalimentacao || '',
          proximaQuestao,
          isFinal: questao.isFinal || !proximaQuestao,
          estadoPaciente: updatedEstado,
          // Reveal all alternatives' tipo for the answered question
          alternativasReveladas: (questao.alternativasEvolutivas || []).map(
            (a: any) => ({
              id: a.id,
              texto: a.texto,
              tipo: a.tipo,
              valor: a.valor,
            }),
          ),
        },
        { status: 201 },
      );
    }

    // ---------------------------------------------------------------
    // STANDARD answer path (multipla / discursiva)
    // ---------------------------------------------------------------

    // 6. Determine correctness server-side (NEVER trust client)
    let correta: boolean | null = null;
    if (questao.tipo === 'multipla' && questao.gabarito) {
      correta = alternativaSelecionada === questao.gabarito;
    }

    // 8. Create the Resposta document
    const resposta = await Resposta.create({
      tentativa: tentativa._id,
      questao: questaoId,
      user: req.user.userId,
      alternativaSelecionada: alternativaSelecionada || null,
      respostaDiscursiva: respostaDiscursiva || null,
      correta,
      tempoResposta,
      respondidaEm: new Date(),
    });

    // 9. Add resposta to tentativa and advance question index
    await Tentativa.updateOne(
      { _id: tentativa._id },
      {
        $push: { respostas: resposta._id },
        $inc: { currentQuestionIndex: 1 },
      },
    );

    // 10. Build response based on feedback configuration
    const responseData: Record<string, unknown> = {
      respostaId: resposta._id.toString(),
      questaoId,
      saved: true,
    };

    if (avaliacao?.configuracao?.feedbackImediato && questao.tipo === 'multipla') {
      responseData.correta = correta;
      responseData.gabaritoLetra = questao.gabarito;
      responseData.respostaComentada = questao.respostaComentada || null;
      responseData.fonteBibliografica = questao.fonteBibliografica || null;
    }

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error('[POST /api/avaliacoes/[id]/responder] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao registrar resposta.' },
      { status: 500 },
    );
  }
});
