import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Questao from '@/lib/db/models/Questao';
import Curso from '@/lib/db/models/Curso';
import User from '@/lib/db/models/User';
import { withAuth, withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { avaliacaoSchema, questaoSchema, questaoEvolutivaSchema, pacienteInicialSchema } from '@/lib/utils/validators';
import { generateProtocolId } from '@/lib/utils/protocol';
import { sanitizeObject } from '@/lib/security/sanitize';
import { encryptIfNeeded } from '@/lib/utils/crypto';

// Force model registration for populate
void Curso;

// ---------------------------------------------------------------------------
// GET /api/avaliacoes - List evaluations (filtered by course access)
// ---------------------------------------------------------------------------

export const GET = withAuth(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo');
    const cursoId = searchParams.get('curso');
    const search = searchParams.get('q') || '';

    const filter: Record<string, unknown> = { isActive: true };

    // Filter by evaluation type
    if (tipo) {
      const validTipos = ['pre-teste', 'pos-teste', 'prova', 'simulacao', 'prova-video', 'simulado-evolutivo'];
      if (validTipos.includes(tipo)) {
        filter.tipo = tipo;
      }
    }

    // Filter by linked course
    if (cursoId) {
      filter.curso = cursoId;
    }

    // Text search
    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    // For non-admin users, only show evaluations from courses they have access to
    // or evaluations not linked to any course (public evaluations)
    if (req.user.role !== 'admin') {
      const user = await User.findById(req.user.userId);
      const activeCursoIds = user ? user.getActiveCursos() : [];
      // Show: evaluations with no course (public) OR evaluations from accessible courses
      filter.$and = [
        ...(filter.$and ? (filter.$and as unknown[]) : []),
        {
          $or: [
            { curso: null },
            { curso: { $in: activeCursoIds } },
          ],
        },
      ];
    }

    const avaliacoes = await Avaliacao.find(filter)
      .populate('curso', 'name protocolId')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ avaliacoes }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/avaliacoes] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar avaliacoes.' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/avaliacoes - Create an evaluation (admin only)
// ---------------------------------------------------------------------------

export const POST = withAdmin(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);

    // Separate questoes from the main body (questoes have their own schema)
    const { questoes: rawQuestoes, questoesEvolutivas: rawQuestoesEvolutivas, pacienteInicial: rawPaciente, ...mainBody } = sanitizedBody;

    const parsed = avaliacaoSchema.safeParse(mainBody);

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

    // --- Validate pacienteInicial for simulado-evolutivo ---
    let pacienteInicial = null;
    if (isEvolutivo) {
      if (!rawPaciente) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: 'Dados do paciente inicial sao obrigatorios para simulado-evolutivo.' },
          { status: 400 },
        );
      }
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
      pacienteInicial = pacienteParsed.data;
    }

    // 1. Create the Avaliacao first (without questoes refs)
    const avaliacao = await Avaliacao.create({
      ...rest,
      curso: cursoId || null,
      preTeste: preTesteId || null,
      protocolId: generateProtocolId('avaliacao'),
      createdBy: req.user.userId,
      questoes: [],
      ...(isEvolutivo && pacienteInicial ? { pacienteInicial } : {}),
      ...(isProvaVideo ? {
        videoUrl: videoUrl || null,
        legendaVideo: legendaVideo || null,
        modoFinalizacao: modoFinalizacao || 'ir-para-resultado',
      } : {}),
    });

    // 2. Create Questao documents
    if (isEvolutivo && Array.isArray(rawQuestoesEvolutivas) && rawQuestoesEvolutivas.length > 0) {
      // Validate each evolutiva question
      const validatedQuestoes = [];
      for (let i = 0; i < rawQuestoesEvolutivas.length; i++) {
        const qParsed = questaoEvolutivaSchema.safeParse(rawQuestoesEvolutivas[i]);
        if (!qParsed.success) {
          await Avaliacao.findByIdAndDelete(avaliacao._id);
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

      // Insert as Questao documents with evolutivo-specific fields
      const createdQuestoes = await Questao.insertMany(
        validatedQuestoes.map((q, i) => ({
          avaliacao: avaliacao._id,
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

      const questaoIds = createdQuestoes.map((q) => q._id);
      await Avaliacao.findByIdAndUpdate(avaliacao._id, {
        $set: { questoes: questaoIds },
      });
      avaliacao.questoes = questaoIds;
    } else if (!isEvolutivo && Array.isArray(rawQuestoes) && rawQuestoes.length > 0) {
      // Standard question validation
      const validatedQuestoes = [];
      for (let i = 0; i < rawQuestoes.length; i++) {
        const qParsed = questaoSchema.safeParse(rawQuestoes[i]);
        if (!qParsed.success) {
          await Avaliacao.findByIdAndDelete(avaliacao._id);
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

      const createdQuestoes = await Questao.insertMany(
        validatedQuestoes.map((q, i) => ({
          ...q,
          avaliacao: avaliacao._id,
          ordem: q.ordem ?? i + 1,
          pontuacao: q.pontuacao ?? 1,
          // Encrypt videoId for prova-video questions
          ...(q.videoConfig?.videoId ? {
            videoConfig: {
              ...q.videoConfig,
              videoId: encryptIfNeeded(q.videoConfig.videoId),
            },
          } : {}),
        })),
      );

      const questaoIds = createdQuestoes.map((q) => q._id);
      await Avaliacao.findByIdAndUpdate(avaliacao._id, {
        $set: { questoes: questaoIds },
      });
      avaliacao.questoes = questaoIds;
    }

    // 3. If linked to a course, add the avaliacao reference to the Curso document
    if (cursoId) {
      await Curso.findByIdAndUpdate(cursoId, {
        $addToSet: { avaliacoes: avaliacao._id },
      });
    }

    return NextResponse.json({ avaliacao }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/avaliacoes] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao criar avaliacao.' },
      { status: 500 },
    );
  }
});
