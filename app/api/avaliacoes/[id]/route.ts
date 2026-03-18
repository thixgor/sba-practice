import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Questao from '@/lib/db/models/Questao';
import Curso from '@/lib/db/models/Curso';
import { withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { avaliacaoSchema, questaoSchema, questaoEvolutivaSchema, pacienteInicialSchema } from '@/lib/utils/validators';
import { sanitizeObject } from '@/lib/security/sanitize';
import { encryptIfNeeded } from '@/lib/utils/crypto';

// Force model registration for populate (serverless may not have loaded them yet)
void Questao;
void Curso;

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
// GET /api/avaliacoes/[id] - Get a single evaluation with questions
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  ctx: RouteContext,
) {
  try {
    const id = await extractId(ctx as RouteContext);
    if (!id) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de avaliacao invalido.' },
        { status: 400 },
      );
    }

    await connectDB();

    const avaliacao = await Avaliacao.findById(id)
      .populate('curso', 'name protocolId')
      .populate('preTeste', 'name protocolId tipo')
      .populate({
        path: 'questoes',
        select: '-videoConfig.videoId', // SECURITY: never expose videoId
        options: { sort: { ordem: 1 } },
      })
      .lean();

    if (!avaliacao) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Avaliacao nao encontrada.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ avaliacao }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/avaliacoes/[id]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar avaliacao.' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/avaliacoes/[id] - Update an evaluation (admin only)
// ---------------------------------------------------------------------------

export const PUT = withAdmin(async (req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    const id = await extractId(ctx);
    if (!id) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de avaliacao invalido.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);

    // Separate questoes from the main body (questoes have their own schema)
    const { questoes: rawQuestoes, questoesEvolutivas: rawQuestoesEvolutivas, pacienteInicial: rawPaciente, ...mainBody } = sanitizedBody;

    const parsed = avaliacaoSchema.partial().safeParse(mainBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Dados da avaliacao invalidos.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    await connectDB();

    const { cursoId, preTesteId, videoUrl, legendaVideo, modoFinalizacao, ...rest } = parsed.data;
    const isEvolutivo = rest.tipo === 'simulado-evolutivo';
    const isProvaVideo = rest.tipo === 'prova-video';

    const updateData: Record<string, unknown> = { ...rest };
    if (cursoId !== undefined) updateData.curso = cursoId || null;
    if (preTesteId !== undefined) updateData.preTeste = preTesteId || null;

    // Handle prova-video fields
    if (isProvaVideo) {
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl || null;
      if (legendaVideo !== undefined) updateData.legendaVideo = legendaVideo || null;
      if (modoFinalizacao !== undefined) updateData.modoFinalizacao = modoFinalizacao || null;
    }

    // Handle pacienteInicial for simulado-evolutivo
    if (isEvolutivo && rawPaciente) {
      const pacienteParsed = pacienteInicialSchema.safeParse(rawPaciente);
      if (!pacienteParsed.success) {
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Dados do paciente inicial invalidos.',
            details: pacienteParsed.error.flatten().fieldErrors,
          },
          { status: 400 },
        );
      }
      updateData.pacienteInicial = pacienteParsed.data;
    }

    // Handle questoes update if provided
    if (isEvolutivo && Array.isArray(rawQuestoesEvolutivas)) {
      // Validate evolutiva questions
      const validatedQuestoes = [];
      for (let i = 0; i < rawQuestoesEvolutivas.length; i++) {
        const qParsed = questaoEvolutivaSchema.safeParse(rawQuestoesEvolutivas[i]);
        if (!qParsed.success) {
          return NextResponse.json(
            {
              error: 'VALIDATION_ERROR',
              message: `Questao evolutiva ${i + 1} invalida.`,
              details: qParsed.error.flatten().fieldErrors,
            },
            { status: 400 },
          );
        }
        validatedQuestoes.push(qParsed.data);
      }

      await Questao.deleteMany({ avaliacao: id });

      const createdQuestoes = await Questao.insertMany(
        validatedQuestoes.map((q, i) => ({
          avaliacao: id,
          tipo: 'multipla' as const,
          enunciado: q.enunciado,
          alternativas: [],
          gabarito: null,
          questaoIdRef: q.questaoIdRef,
          contextoClinico: q.contextoClinico || null,
          isFinal: q.isFinal,
          alternativasEvolutivas: q.alternativasEvolutivas,
          imagemUrl: q.imagemUrl || null,
          videoUrl: q.videoUrl || null,
          ordem: q.ordem ?? i + 1,
          pontuacao: q.pontuacao ?? 1,
        })),
      );

      updateData.questoes = createdQuestoes.map((q) => q._id);
    } else if (!isEvolutivo && Array.isArray(rawQuestoes)) {
      // Standard question validation
      const validatedQuestoes = [];
      for (let i = 0; i < rawQuestoes.length; i++) {
        const qParsed = questaoSchema.safeParse(rawQuestoes[i]);
        if (!qParsed.success) {
          return NextResponse.json(
            {
              error: 'VALIDATION_ERROR',
              message: `Questao ${i + 1} invalida.`,
              details: qParsed.error.flatten().fieldErrors,
            },
            { status: 400 },
          );
        }
        validatedQuestoes.push(qParsed.data);
      }

      await Questao.deleteMany({ avaliacao: id });

      const createdQuestoes = await Questao.insertMany(
        validatedQuestoes.map((q, i) => ({
          ...q,
          avaliacao: id,
          ordem: q.ordem ?? i + 1,
          pontuacao: q.pontuacao ?? 1,
          // Encrypt videoId for prova-video questions
          ...(q.videoConfig?.videoId ? {
            videoConfig: { ...q.videoConfig, videoId: encryptIfNeeded(q.videoConfig.videoId) },
          } : {}),
        })),
      );

      updateData.questoes = createdQuestoes.map((q) => q._id);
    }

    // Handle curso linking changes
    if (cursoId !== undefined) {
      const existingAvaliacao = await Avaliacao.findById(id).lean();
      const oldCursoId = existingAvaliacao?.curso?.toString();
      const newCursoId = cursoId || null;

      // Remove from old curso if changed
      if (oldCursoId && oldCursoId !== newCursoId) {
        await Curso.findByIdAndUpdate(oldCursoId, {
          $pull: { avaliacoes: id },
        });
      }

      // Add to new curso if set
      if (newCursoId && newCursoId !== oldCursoId) {
        await Curso.findByIdAndUpdate(newCursoId, {
          $addToSet: { avaliacoes: id },
        });
      }
    }

    const avaliacao = await Avaliacao.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).lean();

    if (!avaliacao) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Avaliacao nao encontrada.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ avaliacao }, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/avaliacoes/[id]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao atualizar avaliacao.' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/avaliacoes/[id] - Soft-delete an evaluation (admin only)
// ---------------------------------------------------------------------------

export const DELETE = withAdmin(async (_req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    const id = await extractId(ctx);
    if (!id) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de avaliacao invalido.' },
        { status: 400 },
      );
    }

    await connectDB();

    const avaliacao = await Avaliacao.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    ).lean();

    if (!avaliacao) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Avaliacao nao encontrada.' },
        { status: 404 },
      );
    }

    // Remove the avaliacao reference from any Curso that contains it
    if (avaliacao.curso) {
      await Curso.findByIdAndUpdate(avaliacao.curso, {
        $pull: { avaliacoes: id },
      });
    } else {
      // If curso field is null, clean up from any curso that might reference it
      await Curso.updateMany(
        { avaliacoes: id },
        { $pull: { avaliacoes: id } },
      );
    }

    return NextResponse.json(
      { message: 'Avaliacao desativada com sucesso.' },
      { status: 200 },
    );
  } catch (error) {
    console.error('[DELETE /api/avaliacoes/[id]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao desativar avaliacao.' },
      { status: 500 },
    );
  }
});
