import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongoose';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Questao from '@/lib/db/models/Questao';
import Tentativa from '@/lib/db/models/Tentativa';
import Resposta from '@/lib/db/models/Resposta';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAuth, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { decrypt } from '@/lib/utils/crypto';

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
// POST /api/avaliacoes/[id]/video-timestamp
// Receives currentTime from client, returns next timestamp and question if hit
// ---------------------------------------------------------------------------

export const POST = withAuth(async (req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    const id = await extractId(ctx);
    if (!id) {
      return NextResponse.json({ error: 'Invalid assessment ID' }, { status: 400 });
    }

    const body = await req.json();
    const { tentativaId, currentTime, action } = body;

    if (!tentativaId || currentTime === undefined) {
      return NextResponse.json(
        { error: 'tentativaId and currentTime are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify tentativa belongs to user and is in progress
    const tentativa = await Tentativa.findOne({
      _id: tentativaId,
      user: req.user.userId,
      avaliacao: id,
      status: 'em-andamento',
    }).lean() as Record<string, unknown> | null;

    if (!tentativa) {
      return NextResponse.json(
        { error: 'Active attempt not found' },
        { status: 404 }
      );
    }

    // Verify avaliacao is a prova-video type
    const avaliacao = await Avaliacao.findById(id).lean() as Record<string, unknown> | null;
    if (!avaliacao || avaliacao.tipo !== 'prova-video') {
      return NextResponse.json(
        { error: 'Assessment is not a video exam' },
        { status: 400 }
      );
    }

    // Log video action (play, pause, seek)
    if (action) {
      await AuditLog.create({
        user: req.user.userId,
        action: `video_${action}`,
        resource: 'Avaliacao',
        resourceId: id,
        metadata: {
          tentativaId,
          currentTime,
          timestamp: new Date(),
        },
      });
    }

    // Fetch questions with videoConfig that have timestamps
    const questoes = (await Questao.find({
      avaliacao: id,
      'videoConfig.timestampParada': { $exists: true },
    })
      .sort({ 'videoConfig.timestampParada': 1 })
      .lean()) as any[];

    // Find already answered questions by querying Resposta collection
    // (tentativa.respostas contains Resposta IDs, NOT Questao IDs)
    const answeredRespostas = await Resposta.find(
      { tentativa: tentativaId },
      { questao: 1 },
    ).lean();
    const answeredQuestaoIds = new Set(
      answeredRespostas.map((r: any) => r.questao.toString())
    );

    // Find the first unanswered question whose timestamp has been reached.
    // Unlike a narrow window, we trigger any passed-but-unanswered question
    // so that no question is ever skipped due to polling gaps.
    let triggerQuestion = null;
    let nextTimestamp = null;

    for (const q of questoes) {
      if (!q.videoConfig?.timestampParada) continue;

      const ts = q.videoConfig.timestampParada;
      const qId = q._id.toString();

      // Skip already answered
      if (answeredQuestaoIds.has(qId)) continue;

      // If the video has reached (or passed) this timestamp → trigger it
      if (currentTime >= ts - 0.5) {
        triggerQuestion = {
          _id: q._id,
          enunciado: q.enunciado,
          alternativas: q.alternativas,
          tipo: q.tipo,
          tempoResposta: q.videoConfig.tempoResposta || 60,
        };

        // Log the pause event
        await AuditLog.create({
          user: req.user.userId,
          action: 'video_question_trigger',
          resource: 'Questao',
          resourceId: qId,
          metadata: {
            tentativaId,
            currentTime,
            timestampParada: ts,
          },
        });

        break;
      }

      // This question is still upcoming
      nextTimestamp = ts;
      break;
    }

    // Return decrypted videoId on first request (when currentTime is 0)
    let videoId = null;
    let legendaVideo = null;
    if (currentTime === 0) {
      if (questoes.length > 0 && questoes[0].videoConfig?.videoId) {
        try {
          videoId = decrypt(questoes[0].videoConfig.videoId);
        } catch {
          videoId = questoes[0].videoConfig.videoId;
        }
      }
      // Include legenda on first request
      legendaVideo = (avaliacao as Record<string, unknown>).legendaVideo || null;
    }

    // Determine if all questions have been answered
    const allAnswered = answeredQuestaoIds.size >= questoes.length;
    const finished = allAnswered && !triggerQuestion;

    return NextResponse.json({
      triggerQuestion,
      nextTimestamp,
      videoId,
      legendaVideo,
      totalQuestions: questoes.length,
      answeredCount: answeredQuestaoIds.size,
      finished,
    });
  } catch (error) {
    console.error('Video timestamp error:', error);
    return NextResponse.json(
      { error: 'Failed to process video timestamp' },
      { status: 500 }
    );
  }
});
