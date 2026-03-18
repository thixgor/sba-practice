import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Invite from '@/lib/db/models/Invite';

// ---------------------------------------------------------------------------
// GET /api/invites/[token] - Validate invite token (public)
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    if (!token || token.length < 10) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Token invalido.' },
        { status: 400 },
      );
    }

    await connectDB();

    const invite = await Invite.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!invite) {
      return NextResponse.json(
        { error: 'INVITE_NOT_FOUND', message: 'Convite invalido, expirado ou ja utilizado.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      invite: {
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error('[GET /api/invites/[token]] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao validar convite.' },
      { status: 500 },
    );
  }
}
