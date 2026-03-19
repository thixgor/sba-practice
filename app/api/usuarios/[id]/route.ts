import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import Curso from '@/lib/db/models/Curso';
import AuditLog from '@/lib/db/models/AuditLog';
import {
  withAdmin,
  type AuthenticatedRequest,
  type RouteContext,
} from '@/lib/auth/middleware';
import { getClientIP } from '@/lib/security/rateLimit';

// Force model registration for populate
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
// GET /api/usuarios/[id] - Get single user details (admin only)
// ---------------------------------------------------------------------------

export const GET = withAdmin(async (_req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    const id = await extractId(ctx);
    if (!id) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de usuario invalido.' },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findById(id)
      .select('-passwordHash -refreshTokens')
      .populate({
        path: 'cursos',
        select: 'name protocolId isActive',
      })
      .populate({
        path: 'cursosAccess.curso',
        select: 'name protocolId isActive',
      })
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Usuario nao encontrado.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/usuarios/[id]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar usuario.' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/usuarios/[id] - Update user (admin only)
// Supports: isActive, role, name, and course access management
// ---------------------------------------------------------------------------

export const PATCH = withAdmin(async (req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    const id = await extractId(ctx);
    if (!id) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de usuario invalido.' },
        { status: 400 },
      );
    }

    const body = await req.json();

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Usuario nao encontrado.' },
        { status: 404 },
      );
    }

    const ip = getClientIP(req);
    const changes: string[] = [];

    // Toggle isActive
    if (typeof body.isActive === 'boolean') {
      user.isActive = body.isActive;
      changes.push(`isActive=${body.isActive}`);
    }

    // Update role
    if (body.role === 'admin' || body.role === 'user') {
      user.role = body.role;
      changes.push(`role=${body.role}`);
    }

    // Update name
    if (typeof body.name === 'string' && body.name.trim()) {
      user.name = body.name.trim();
      changes.push('name updated');
    }

    // Grant course access
    if (body.grantCourseAccess && typeof body.grantCourseAccess === 'object') {
      const { cursoId, accessDurationMinutes } = body.grantCourseAccess;
      if (cursoId && mongoose.Types.ObjectId.isValid(cursoId)) {
        const curso = await Curso.findById(cursoId);
        if (!curso) {
          return NextResponse.json(
            { error: 'NOT_FOUND', message: 'Curso nao encontrado.' },
            { status: 404 },
          );
        }

        const now = new Date();
        const expiresAt = accessDurationMinutes
          ? new Date(now.getTime() + accessDurationMinutes * 60 * 1000)
          : null;

        // Add to cursosAccess
        user.cursosAccess.push({
          curso: new mongoose.Types.ObjectId(cursoId),
          grantedAt: now,
          expiresAt,
          source: 'admin',
          sourceRef: null,
        });

        // Also add to legacy cursos array if not already there
        const cursoObjId = new mongoose.Types.ObjectId(cursoId);
        if (!user.cursos.some((c: mongoose.Types.ObjectId) => c.toString() === cursoId)) {
          user.cursos.push(cursoObjId);
        }

        changes.push(`granted access to curso ${curso.name}`);
      }
    }

    // Revoke course access
    if (body.revokeCourseAccess && typeof body.revokeCourseAccess === 'string') {
      const cursoId = body.revokeCourseAccess;
      if (mongoose.Types.ObjectId.isValid(cursoId)) {
        // Remove from cursosAccess
        user.cursosAccess = user.cursosAccess.filter(
          (ca: { curso: mongoose.Types.ObjectId }) => ca.curso.toString() !== cursoId,
        );
        // Remove from legacy cursos array
        user.cursos = user.cursos.filter(
          (c: mongoose.Types.ObjectId) => c.toString() !== cursoId,
        );
        changes.push(`revoked access to curso ${cursoId}`);
      }
    }

    if (changes.length === 0) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Nenhuma alteracao valida informada.' },
        { status: 400 },
      );
    }

    await user.save();

    // Audit log
    await AuditLog.create({
      user: req.user.userId,
      action: 'user_updated',
      resource: 'user',
      resourceId: id,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || null,
      metadata: { changes },
    });

    // Return updated user
    const updatedUser = await User.findById(id)
      .select('-passwordHash -refreshTokens')
      .populate({ path: 'cursosAccess.curso', select: 'name protocolId isActive' })
      .lean();

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/usuarios/[id]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao atualizar usuario.' },
      { status: 500 },
    );
  }
});
