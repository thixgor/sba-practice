import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Invite from '@/lib/db/models/Invite';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';

// ---------------------------------------------------------------------------
// Helper: extract ID from dynamic route params
// ---------------------------------------------------------------------------

async function extractId(ctx: RouteContext): Promise<string> {
  const params = await ctx.params!;
  return params.id as string;
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/invites/[id] - Revoke an invite (admin only)
// ---------------------------------------------------------------------------

export const DELETE = withAdmin(async (req: AuthenticatedRequest, ctx: RouteContext) => {
  try {
    const id = await extractId(ctx);

    await connectDB();

    const invite = await Invite.findById(id);
    if (!invite) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Convite nao encontrado.' },
        { status: 404 },
      );
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        {
          error: 'INVALID_STATUS',
          message: `Nao e possivel revogar um convite com status "${invite.status}".`,
        },
        { status: 400 },
      );
    }

    invite.status = 'revoked';
    invite.revokedAt = new Date();
    await invite.save();

    // Audit log
    await AuditLog.create({
      user: req.user.userId,
      action: 'invite_revoked',
      resource: 'invite',
      resourceId: invite._id.toString(),
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      metadata: { email: invite.email, token: invite.token },
    });

    return NextResponse.json({
      message: 'Convite revogado com sucesso.',
      invite: {
        _id: invite._id.toString(),
        status: invite.status,
        revokedAt: invite.revokedAt,
      },
    });
  } catch (error) {
    console.error('[DELETE /api/admin/invites/[id]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao revogar convite.' },
      { status: 500 },
    );
  }
});
