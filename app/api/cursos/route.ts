import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Curso from '@/lib/db/models/Curso';
import Avaliacao from '@/lib/db/models/Avaliacao';
import User from '@/lib/db/models/User';
import { withAuth, withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';

// Force model registration for populate
void Avaliacao;
import { cursoSchema } from '@/lib/utils/validators';
import { generateProtocolId } from '@/lib/utils/protocol';
import { sanitizeObject } from '@/lib/security/sanitize';

// ---------------------------------------------------------------------------
// GET /api/cursos - List courses (filtered by user access)
// ---------------------------------------------------------------------------

export const GET = withAuth(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
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

    // Get user's active course IDs for access marking
    let activeCursoIds: string[] = [];
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      const user = await User.findById(req.user.userId);
      if (user) {
        activeCursoIds = user.getActiveCursos().map((c) => c.toString());
      }
    }

    const cursos = await Curso.find(filter)
      .populate({
        path: 'avaliacoes',
        select: 'name tipo protocolId isActive questoes configuracao',
        match: { isActive: true },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out null entries left by populate match and mark access
    for (const curso of cursos) {
      if (curso.avaliacoes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        curso.avaliacoes = (curso.avaliacoes as any[]).filter(Boolean);
      }
      // Mark access status for non-admin users
      if (!isAdmin) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (curso as any).hasAccess = activeCursoIds.includes(curso._id.toString());
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (curso as any).hasAccess = true;
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
});

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
