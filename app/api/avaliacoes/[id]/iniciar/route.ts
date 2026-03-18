import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Questao from '@/lib/db/models/Questao';
import Tentativa from '@/lib/db/models/Tentativa';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAuth, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { generateProtocolId } from '@/lib/utils/protocol';
import { getClientIP } from '@/lib/security/rateLimit';

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
// Helper: shuffle array (Fisher-Yates)
// ---------------------------------------------------------------------------

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

// ---------------------------------------------------------------------------
// POST /api/avaliacoes/[id]/iniciar - Start an evaluation attempt
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

    // 1. Find the avaliacao
    const avaliacao = await Avaliacao.findById(avaliacaoId).lean();

    if (!avaliacao || !avaliacao.isActive) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Avaliacao nao encontrada ou inativa.' },
        { status: 404 },
      );
    }

    const isEvolutivo = avaliacao.tipo === 'simulado-evolutivo';
    const isProvaVideo = avaliacao.tipo === 'prova-video';

    // 2. Check if user has an in-progress attempt
    const existingAttempt = await Tentativa.findOne({
      user: req.user.userId,
      avaliacao: avaliacaoId,
      status: 'em-andamento',
    }).lean();

    if (existingAttempt) {
      if (isProvaVideo || isEvolutivo) {
        // Prova de Vídeo and Simulado Evolutivo do NOT support resume.
        // If the user closes and comes back, the old attempt is expired
        // and a fresh one is created. This prevents stale state issues.
        await Tentativa.findByIdAndUpdate(existingAttempt._id, {
          status: 'expirada',
          finalizadaEm: new Date(),
        });
        // Fall through to create a new tentativa below
      } else {
        // Normal types (pre-teste, pos-teste, prova, simulacao): resume existing
        const questoes = await Questao.find({ avaliacao: avaliacaoId })
          .select('-gabarito -respostaComentada -fonteBibliografica -videoConfig.videoId')
          .sort({ ordem: 1 })
          .lean();

        return NextResponse.json(
          {
            tentativa: existingAttempt,
            questoes,
            resumed: true,
          },
          { status: 200 },
        );
      }
    }

    // 3. Check max attempts allowed (only count properly FINALIZED attempts,
    //    not expired/abandoned ones — those don't count against the limit)
    const completedAttempts = await Tentativa.countDocuments({
      user: req.user.userId,
      avaliacao: avaliacaoId,
      status: 'finalizada',
    });

    // 0 means unlimited attempts
    if (avaliacao.configuracao.tentativasPermitidas > 0 && completedAttempts >= avaliacao.configuracao.tentativasPermitidas) {
      return NextResponse.json(
        {
          error: 'MAX_ATTEMPTS_REACHED',
          message: `Numero maximo de tentativas atingido (${avaliacao.configuracao.tentativasPermitidas}).`,
        },
        { status: 403 },
      );
    }

    // 4. Load questions for this avaliacao
    let questoes = await Questao.find({ avaliacao: avaliacaoId })
      .sort({ ordem: 1 })
      .lean();

    if (questoes.length === 0) {
      return NextResponse.json(
        { error: 'NO_QUESTIONS', message: 'Esta avaliacao nao possui questoes cadastradas.' },
        { status: 400 },
      );
    }

    // 5. Shuffle questions if configured (NEVER shuffle for simulado-evolutivo - branching controls order)
    if (!isEvolutivo && avaliacao.configuracao.embaralharQuestoes) {
      questoes = shuffleArray(questoes);
    }

    // 6. Shuffle alternatives if configured (not for evolutivo)
    if (!isEvolutivo && avaliacao.configuracao.embaralharAlternativas) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      questoes = (questoes as any[]).map((q: any) => ({
        ...q,
        alternativas: Array.isArray(q.alternativas) ? shuffleArray(q.alternativas) : q.alternativas,
      })) as typeof questoes;
    }

    // 7. Calculate total score
    const pontuacaoTotal = questoes.reduce((sum, q) => sum + (q.pontuacao || 1), 0);

    // 8. Create the tentativa
    const ip = getClientIP(req);

    // For evolutivo: initialize estadoPaciente from avaliacao.pacienteInicial
    const estadoPacienteInicial = isEvolutivo && avaliacao.pacienteInicial
      ? {
          sinaisVitais: { ...avaliacao.pacienteInicial.sinaisVitais },
          ecg: { ...avaliacao.pacienteInicial.ecg },
          statusPaciente: avaliacao.pacienteInicial.statusPaciente || 'Estável',
          historico: [{ texto: `Paciente admitido: ${avaliacao.pacienteInicial.queixa}`, timestamp: new Date() }],
        }
      : null;

    const tentativa = await Tentativa.create({
      protocolId: generateProtocolId('tentativa'),
      user: req.user.userId,
      avaliacao: avaliacaoId,
      iniciadaEm: new Date(),
      pontuacaoTotal,
      status: 'em-andamento',
      ipAddress: ip,
      deviceFingerprint: req.headers.get('user-agent') || null,
      currentQuestionIndex: 0,
      ...(isEvolutivo ? { estadoPaciente: estadoPacienteInicial, questoesRespondidas: [] } : {}),
    });

    // 9. Audit log
    await AuditLog.create({
      user: req.user.userId,
      action: 'tentativa_started',
      resource: 'tentativa',
      resourceId: tentativa._id.toString(),
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || null,
      metadata: {
        avaliacaoId,
        avaliacaoName: avaliacao.name,
        totalQuestoes: questoes.length,
        tipo: avaliacao.tipo,
      },
    });

    // 10. Strip sensitive data from questions before sending to client
    if (isEvolutivo) {
      // For simulado-evolutivo: send all questions with branching data but strip answer info
      const safeQuestoes = questoes.map((q) => ({
        _id: q._id,
        tipo: q.tipo,
        enunciado: q.enunciado,
        questaoIdRef: q.questaoIdRef,
        contextoClinico: q.contextoClinico,
        isFinal: q.isFinal,
        // Send alternatives without valor/impacto/retroalimentacao (sensitive)
        alternativasEvolutivas: (q.alternativasEvolutivas || []).map((a: any) => ({
          id: a.id,
          texto: a.texto,
          // tipo/valor/impacto/retroalimentacao are NOT sent - revealed after answer
        })),
        imagemUrl: q.imagemUrl,
        videoUrl: q.videoUrl,
        ordem: q.ordem,
        pontuacao: q.pontuacao,
      }));

      return NextResponse.json(
        {
          tentativa: {
            _id: tentativa._id.toString(),
            protocolId: tentativa.protocolId,
            avaliacaoId: tentativa.avaliacao.toString(),
            iniciadaEm: tentativa.iniciadaEm,
            status: tentativa.status,
            pontuacaoTotal,
            currentQuestionIndex: 0,
            tempoLimiteMinutos: avaliacao.configuracao.tempoLimiteMinutos || null,
            feedbackImediato: avaliacao.configuracao.feedbackImediato,
            estadoPaciente: estadoPacienteInicial,
          },
          questoes: safeQuestoes,
          pacienteInicial: avaliacao.pacienteInicial,
          resumed: false,
        },
        { status: 201 },
      );
    }

    const safeQuestoes = questoes.map((q) => ({
      _id: q._id,
      tipo: q.tipo,
      enunciado: q.enunciado,
      alternativas: q.alternativas,
      imagemUrl: q.imagemUrl,
      videoUrl: q.videoUrl,
      ordem: q.ordem,
      pontuacao: q.pontuacao,
      // NEVER expose: gabarito, respostaComentada, fonteBibliografica, videoConfig.videoId
    }));

    return NextResponse.json(
      {
        tentativa: {
          _id: tentativa._id.toString(),
          protocolId: tentativa.protocolId,
          avaliacaoId: tentativa.avaliacao.toString(),
          iniciadaEm: tentativa.iniciadaEm,
          status: tentativa.status,
          pontuacaoTotal,
          currentQuestionIndex: 0,
          tempoLimiteMinutos: avaliacao.configuracao.tempoLimiteMinutos || null,
          feedbackImediato: avaliacao.configuracao.feedbackImediato,
        },
        questoes: safeQuestoes,
        // Prova de Video fields
        ...(isProvaVideo ? {
          legendaVideo: avaliacao.legendaVideo || null,
          modoFinalizacao: avaliacao.modoFinalizacao || 'ir-para-resultado',
        } : {}),
        resumed: false,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/avaliacoes/[id]/iniciar] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao iniciar avaliacao.' },
      { status: 500 },
    );
  }
});
