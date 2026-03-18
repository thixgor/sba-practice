import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getAccessToken } from '@/lib/auth/cookies';

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    // 1. Get access token from cookies
    const token = await getAccessToken();

    if (!token) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Nao autenticado.' },
        { status: 401 },
      );
    }

    // 2. Verify the access token
    let payload;
    try {
      payload = await verifyAccessToken(token);
    } catch {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Token invalido ou expirado.' },
        { status: 401 },
      );
    }

    // 3. Find user in DB (no password)
    await connectDB();

    const user = await User.findById(payload.userId)
      .select('-passwordHash -refreshTokens')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'Usuario nao encontrado.' },
        { status: 404 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'ACCOUNT_DISABLED', message: 'Conta desativada.' },
        { status: 403 },
      );
    }

    // 4. Return user data
    return NextResponse.json(
      {
        user: {
          _id: user._id.toString(),
          protocolId: user.protocolId,
          name: user.name,
          email: user.email,
          role: user.role,
          cpf: user.cpf,
          crm: user.crm,
          cursos: user.cursos,
          lastLogin: user.lastLogin,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[GET /api/auth/me] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
      { status: 500 },
    );
  }
}
