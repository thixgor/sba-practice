import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import connectDB from '@/lib/db/mongoose';
import Invite from '@/lib/db/models/Invite';
import User from '@/lib/db/models/User';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { createInviteSchema } from '@/lib/utils/validators';
import { sanitizeObject } from '@/lib/security/sanitize';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sba-practice.vercel.app';

// ---------------------------------------------------------------------------
// POST /api/admin/invites - Create an invite link (admin only)
// ---------------------------------------------------------------------------

export const POST = withAdmin(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    const parsed = createInviteSchema.safeParse(sanitizedBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Dados do convite invalidos.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    await connectDB();

    const { email, role, expiresInHours } = parsed.data;
    const normalizedEmail = email && email.length > 0 ? email : null;

    // Check if there's already an active invite for this email
    if (normalizedEmail) {
      const existingInvite = await Invite.findOne({
        email: normalizedEmail,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      }).lean();

      if (existingInvite) {
        return NextResponse.json(
          {
            error: 'INVITE_EXISTS',
            message: 'Ja existe um convite ativo para este email.',
          },
          { status: 409 },
        );
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail }).lean();
      if (existingUser) {
        return NextResponse.json(
          {
            error: 'USER_EXISTS',
            message: 'Ja existe um usuario cadastrado com este email.',
          },
          { status: 409 },
        );
      }
    }

    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invite = await Invite.create({
      token,
      email: normalizedEmail,
      role,
      createdBy: req.user.userId,
      expiresAt,
      status: 'pending',
    });

    // Audit log
    await AuditLog.create({
      user: req.user.userId,
      action: 'invite_created',
      resource: 'invite',
      resourceId: invite._id.toString(),
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      metadata: { email: normalizedEmail, role, expiresInHours },
    });

    const inviteLink = `${APP_URL.replace(/\/$/, '')}/convite/${token}`;

    return NextResponse.json(
      {
        invite: {
          _id: invite._id.toString(),
          token: invite.token,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
        },
        inviteLink,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/admin/invites] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao criar convite.' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/invites - List invites (admin only)
// ---------------------------------------------------------------------------

export const GET = withAdmin(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const filter: Record<string, unknown> = {};
    if (status && ['pending', 'accepted', 'revoked'].includes(status)) {
      filter.status = status;
    }

    const [invites, total] = await Promise.all([
      Invite.find(filter)
        .populate('createdBy', 'name email')
        .populate('usedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Invite.countDocuments(filter),
    ]);

    return NextResponse.json({
      invites,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/invites] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao listar convites.' },
      { status: 500 },
    );
  }
});
