import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Curso from '@/lib/db/models/Curso';
import Avaliacao from '@/lib/db/models/Avaliacao';
import { withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';

// Force model registration for populate
void Avaliacao;
import { cursoSchema } from '@/lib/utils/validators';
import { generateProtocolId } from '@/lib/utils/protocol';
import { sanitizeObject } from '@/lib/security/sanitize';

// ---------------------------------------------------------------------------
// GET /api/cursos - List active courses (authenticated users)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';

    const filter: Record<string, unknown> = { isActive: true };

    // Optional text search
    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const cursos = await Curso.find(filter)
      .populate({
        path: 'avaliacoes',
        select: 'name tipo protocolId isActive questoes configuracao',
        match: { isActive: true },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out null entries left by populate match
    for (const curso of cursos) {
      if (curso.avaliacoes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        curso.avaliacoes = (curso.avaliacoes as any[]).filter(Boolean);
      }
    }

    return NextResponse.json({ cursos }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/cursos] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar cursos.' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/cursos - Create a course (admin only)
// ---------------------------------------------------------------------------

export const POST = withAdmin(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    const parsed = cursoSchema.safeParse(sanitizedBody);

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

    const curso = await Curso.create({
      ...parsed.data,
      protocolId: generateProtocolId('curso'),
      createdBy: req.user.userId,
    });

    return NextResponse.json({ curso }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/cursos] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao criar curso.' },
      { status: 500 },
    );
  }
});
