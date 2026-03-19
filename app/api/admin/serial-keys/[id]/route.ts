import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import SerialKey from '@/lib/db/models/SerialKey';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';

// ---------------------------------------------------------------------------
// GET /api/admin/serial-keys/[id] - Get serial key details
// ---------------------------------------------------------------------------

export const GET = withAdmin(async (_req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    await connectDB();

    const params = await ctx.params!;
    const id = params.id as string;

    const serialKey = await SerialKey.findById(id)
      .populate('cursos.curso', 'name protocolId')
      .populate('createdBy', 'name email')
      .populate('usedBy.user', 'name email protocolId')
      .lean();

    if (!serialKey) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Serial key nao encontrada.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ serialKey });
  } catch (error) {
    console.error('[GET /api/admin/serial-keys/[id]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar serial key.' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/serial-keys/[id] - Revoke serial key
// ---------------------------------------------------------------------------

export const DELETE = withAdmin(async (req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    await connectDB();

    const params = await ctx.params!;
    const id = params.id as string;

    const serialKey = await SerialKey.findById(id);

    if (!serialKey) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Serial key nao encontrada.' },
        { status: 404 },
      );
    }

    if (serialKey.status === 'revoked') {
      return NextResponse.json(
        { error: 'ALREADY_REVOKED', message: 'Serial key ja foi revogada.' },
        { status: 400 },
      );
    }

    serialKey.status = 'revoked';
    await serialKey.save();

    await AuditLog.create({
      user: req.user.userId,
      action: 'serial_key_revoked',
      resource: 'serial_key',
      resourceId: serialKey._id.toString(),
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      metadata: { protocolId: serialKey.protocolId },
    });

    return NextResponse.json({ message: 'Serial key revogada com sucesso.' });
  } catch (error) {
    console.error('[DELETE /api/admin/serial-keys/[id]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao revogar serial key.' },
      { status: 500 },
    );
  }
});
