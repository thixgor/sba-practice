import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import AuditLog from '@/lib/db/models/AuditLog';
import { registerSchema } from '@/lib/utils/validators';
import { generateProtocolId } from '@/lib/utils/protocol';
import { sanitizeObject, sanitizeEmail } from '@/lib/security/sanitize';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitKey } from '@/lib/security/rateLimit';

// ---------------------------------------------------------------------------
// POST /api/auth/register  — Public self-registration
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 registrations per hour per IP
    const ip = getClientIP(req);
    const key = rateLimitKey('register', ip);
    const rl = await checkRateLimit(key, RATE_LIMITS.register);

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Muitas tentativas de cadastro. Tente novamente mais tarde.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': String(rl.remaining),
          },
        },
      );
    }

    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    const parsed = registerSchema.safeParse(sanitizedBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email: rawEmail, password, cpf, crm } = parsed.data;

    const email = sanitizeEmail(rawEmail);
    if (!email) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'E-mail inválido.' },
        { status: 400 },
      );
    }

    await connectDB();

    // Check if email already exists
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json(
        { error: 'EMAIL_EXISTS', message: 'Este e-mail já está cadastrado.' },
        { status: 409 },
      );
    }

    // Hash password (12 rounds — CLAUDE.md spec)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with role "user" (never admin via public registration)
    const user = await User.create({
      protocolId: generateProtocolId('user'),
      name,
      email,
      passwordHash,
      role: 'user',
      cpf: cpf || null,
      crm: crm || null,
      isActive: true,
    });

    // Audit log
    await AuditLog.create({
      user: user._id,
      action: 'self_registration',
      resource: 'user',
      resourceId: user._id.toString(),
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json(
      {
        message: 'Conta criada com sucesso.',
        user: {
          _id: user._id.toString(),
          protocolId: user.protocolId,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/auth/register] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao criar conta.' },
      { status: 500 },
    );
  }
}
