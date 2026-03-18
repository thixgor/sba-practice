import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongoose';
import Invite from '@/lib/db/models/Invite';
import User from '@/lib/db/models/User';
import AuditLog from '@/lib/db/models/AuditLog';
import { acceptInviteSchema } from '@/lib/utils/validators';
import { generateProtocolId } from '@/lib/utils/protocol';
import { sanitizeObject, sanitizeEmail } from '@/lib/security/sanitize';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitKey } from '@/lib/security/rateLimit';

// ---------------------------------------------------------------------------
// POST /api/invites/[token]/accept - Accept invite and register (public)
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
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

    // Rate limit
    const ip = getClientIP(req);
    const key = rateLimitKey('register', ip);
    const rl = await checkRateLimit(key, RATE_LIMITS.register);

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Muitas tentativas. Tente novamente mais tarde.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

    // Parse body
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    const parsed = acceptInviteSchema.safeParse(sanitizedBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Dados invalidos.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email: rawEmail, password, cpf, crm } = parsed.data;
    const email = sanitizeEmail(rawEmail);

    if (!email) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'E-mail invalido.' },
        { status: 400 },
      );
    }

    await connectDB();

    // Find and validate invite
    const invite = await Invite.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'INVITE_NOT_FOUND', message: 'Convite invalido, expirado ou ja utilizado.' },
        { status: 404 },
      );
    }

    // If invite has email, verify it matches
    if (invite.email && invite.email !== email) {
      return NextResponse.json(
        {
          error: 'EMAIL_MISMATCH',
          message: 'O email informado nao corresponde ao convite.',
        },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return NextResponse.json(
        { error: 'EMAIL_EXISTS', message: 'Este e-mail ja esta cadastrado.' },
        { status: 409 },
      );
    }

    // Hash password (12 rounds)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      protocolId: generateProtocolId('user'),
      name,
      email,
      passwordHash,
      role: invite.role,
      cpf: cpf || null,
      crm: crm || null,
      isActive: true,
    });

    // Update invite
    invite.status = 'accepted';
    invite.usedAt = new Date();
    invite.usedBy = user._id;
    await invite.save();

    // Audit logs
    await Promise.all([
      AuditLog.create({
        user: user._id,
        action: 'invite_accepted',
        resource: 'invite',
        resourceId: invite._id.toString(),
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || null,
        metadata: { inviteToken: token, inviteEmail: invite.email },
      }),
      AuditLog.create({
        user: user._id,
        action: 'user_created_via_invite',
        resource: 'user',
        resourceId: user._id.toString(),
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || null,
        metadata: { role: invite.role, createdBy: invite.createdBy.toString() },
      }),
    ]);

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
    console.error('[POST /api/invites/[token]/accept] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao aceitar convite.' },
      { status: 500 },
    );
  }
}
