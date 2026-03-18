import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Curso from '@/lib/db/models/Curso';
import { withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { cursoSchema } from '@/lib/utils/validators';
import { sanitizeObject } from '@/lib/security/sanitize';

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
// GET /api/cursos/[id] - Get a single course
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  ctx: RouteContext,
) {
  try {
    const id = await extractId(ctx as RouteContext);
    if (!id) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de curso invalido.' },
        { status: 400 },
      );
    }

    await connectDB();

    const curso = await Curso.findById(id)
      .populate({
        path: 'avaliacoes',
        select: 'name tipo protocolId isActive questoes configuracao',
        match: { isActive: true },
      })
      .lean();

    if (!curso) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Curso nao encontrado.' },
        { status: 404 },
      );
    }

    // Filter out null entries left by populate match (Mongoose sets non-matching refs to null)
    if (curso.avaliacoes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      curso.avaliacoes = (curso.avaliacoes as any[]).filter(Boolean);
    }

    return NextResponse.json({ curso }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/cursos/[id]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar curso.' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/cursos/[id] - Update a course (admin only)
// ---------------------------------------------------------------------------

export const PUT = withAdmin(async (req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    const id = await extractId(ctx);
    if (!id) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de curso invalido.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    const parsed = cursoSchema.partial().safeParse(sanitizedBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Dados do curso invalidos.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    await connectDB();

    const curso = await Curso.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true },
    ).lean();

    if (!curso) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Curso nao encontrado.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ curso }, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/cursos/[id]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao atualizar curso.' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/cursos/[id] - Partial update a course (admin only)
// ---------------------------------------------------------------------------

export const PATCH = withAdmin(async (req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    const id = await extractId(ctx);
    if (!id) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de curso invalido.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);

    // Allow partial updates (e.g., toggling isActive)
    const allowedFields = ['name', 'description', 'imageUrl', 'duracao', 'isActive'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in sanitizedBody) {
        updateData[key] = sanitizedBody[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Nenhum campo valido para atualizar.' },
        { status: 400 },
      );
    }

    await connectDB();

    const curso = await Curso.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).lean();

    if (!curso) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Curso nao encontrado.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ curso }, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/cursos/[id]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao atualizar curso.' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/cursos/[id] - Soft-delete a course (admin only)
// ---------------------------------------------------------------------------

export const DELETE = withAdmin(async (_req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    const id = await extractId(ctx);
    if (!id) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de curso invalido.' },
        { status: 400 },
      );
    }

    await connectDB();

    const curso = await Curso.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    ).lean();

    if (!curso) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Curso nao encontrado.' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: 'Curso desativado com sucesso.' },
      { status: 200 },
    );
  } catch (error) {
    console.error('[DELETE /api/cursos/[id]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao desativar curso.' },
      { status: 500 },
    );
  }
});
