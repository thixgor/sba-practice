import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/cookies';

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    await clearAuthCookies();

    return NextResponse.json(
      { message: 'Logged out' },
      { status: 200 },
    );
  } catch (error) {
    console.error('[POST /api/auth/logout] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao realizar logout.' },
      { status: 500 },
    );
  }
}
