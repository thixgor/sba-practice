import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import AuditLog from '@/lib/db/models/AuditLog';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { setAuthCookies } from '@/lib/auth/cookies';
import { checkRateLimit, RATE_LIMITS, getClientIP, rateLimitKey } from '@/lib/security/rateLimit';
import { sanitizeEmail } from '@/lib/security/sanitize';
import { loginSchema } from '@/lib/utils/validators';

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validate request body
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Dados de login invalidos.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email: rawEmail, password } = parsed.data;

    // 2. Rate limit check (by IP)
    const ip = getClientIP(req);
    const rlKey = rateLimitKey('login', ip);
    const rlResult = await checkRateLimit(rlKey, RATE_LIMITS.login);

    if (!rlResult.allowed) {
      const retryAfter = Math.ceil((rlResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'RATE_LIMIT',
          message: 'Muitas tentativas de login. Tente novamente mais tarde.',
          retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        },
      );
    }

    // 3. Sanitize email
    const email = sanitizeEmail(rawEmail);
    if (!email) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Email invalido.' },
        { status: 400 },
      );
    }

    // 4. Connect to DB & find user (include passwordHash)
    await connectDB();

    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      // Log failed attempt (user not found)
      await AuditLog.create({
        user: null,
        action: 'login_failed',
        resource: 'auth',
        resourceId: null,
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || null,
        metadata: { reason: 'user_not_found', email },
      });

      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS', message: 'Email ou senha incorretos.' },
        { status: 401 },
      );
    }

    // 5. Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'ACCOUNT_DISABLED', message: 'Conta desativada. Entre em contato com o administrador.' },
        { status: 403 },
      );
    }

    // 6. Check if account is locked
    if (user.isLocked()) {
      return NextResponse.json(
        { error: 'ACCOUNT_LOCKED', message: 'Conta bloqueada temporariamente. Tente novamente mais tarde.' },
        { status: 423 },
      );
    }

    // 7. Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      // Increment loginAttempts
      const updates: Record<string, unknown> = {
        $inc: { loginAttempts: 1 },
      };

      // Lock account after 10 consecutive failures (30min lock)
      if (user.loginAttempts + 1 >= 10) {
        updates.$set = { lockUntil: new Date(Date.now() + 30 * 60 * 1000) };
      }

      await User.updateOne({ _id: user._id }, updates);

      // Audit log
      await AuditLog.create({
        user: user._id,
        action: 'login_failed',
        resource: 'auth',
        resourceId: user._id.toString(),
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || null,
        metadata: { reason: 'invalid_password', attempts: user.loginAttempts + 1 },
      });

      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS', message: 'Email ou senha incorretos.' },
        { status: 401 },
      );
    }

    // 8. Success: reset loginAttempts, update lastLogin
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          loginAttempts: 0,
          lockUntil: null,
          lastLogin: new Date(),
        },
      },
    );

    // 9. Sign tokens
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      protocolId: user.protocolId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    // 10. Set HTTP-only cookies
    await setAuthCookies(accessToken, refreshToken);

    // 11. Audit log success
    await AuditLog.create({
      user: user._id,
      action: 'login_success',
      resource: 'auth',
      resourceId: user._id.toString(),
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || null,
    });

    // 12. Return user data (never include password)
    return NextResponse.json(
      {
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
    console.error('[POST /api/auth/login] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
      { status: 500 },
    );
  }
}
