import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { getRefreshToken, setAuthCookies, clearAuthCookies } from '@/lib/auth/cookies';

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    // 1. Get refresh token from cookies
    const refreshTokenValue = await getRefreshToken();

    if (!refreshTokenValue) {
      return NextResponse.json(
        { error: 'NO_REFRESH_TOKEN', message: 'Refresh token nao encontrado.' },
        { status: 401 },
      );
    }

    // 2. Verify the refresh token
    let payload;
    try {
      payload = await verifyRefreshToken(refreshTokenValue);
    } catch {
      // Token is invalid or expired - clear cookies
      await clearAuthCookies();
      return NextResponse.json(
        { error: 'INVALID_REFRESH_TOKEN', message: 'Refresh token invalido ou expirado.' },
        { status: 401 },
      );
    }

    // 3. Find user in DB to confirm still active
    await connectDB();

    const user = await User.findById(payload.userId).lean();

    if (!user) {
      await clearAuthCookies();
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'Usuario nao encontrado.' },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      await clearAuthCookies();
      return NextResponse.json(
        { error: 'ACCOUNT_DISABLED', message: 'Conta desativada.' },
        { status: 403 },
      );
    }

    // 4. Sign new tokens (rotation)
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role as 'admin' | 'user',
      protocolId: user.protocolId,
    };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      signAccessToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    // 5. Set new cookies
    await setAuthCookies(newAccessToken, newRefreshToken);

    // 6. Return success
    return NextResponse.json(
      {
        message: 'Token refreshed successfully.',
        user: {
          userId: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          protocolId: user.protocolId,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[POST /api/auth/refresh] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
      { status: 500 },
    );
  }
}
