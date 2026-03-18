import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import AuditLog from '@/lib/db/models/AuditLog';
import {
  withAdmin,
  type AuthenticatedRequest,
  type RouteContext,
} from '@/lib/auth/middleware';
import { adminCreateUserSchema, paginationFromSearchParams } from '@/lib/utils/validators';
import { generateProtocolId } from '@/lib/utils/protocol';
import { sanitizeObject, sanitizeEmail } from '@/lib/security/sanitize';
import { getClientIP } from '@/lib/security/rateLimit';

// ---------------------------------------------------------------------------
// GET /api/usuarios - List users (admin, paginated)
// ---------------------------------------------------------------------------

export const GET = withAdmin(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    // Parse pagination params from URL search params
    const paginationInput = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    const pagination = paginationFromSearchParams.parse(paginationInput);
    const search = searchParams.get('q') || '';
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');

    // Build filter
    const filter: Record<string, unknown> = {};

    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { protocolId: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (role === 'admin' || role === 'user') {
      filter.role = role;
    }

    if (isActive === 'true') {
      filter.isActive = true;
    } else if (isActive === 'false') {
      filter.isActive = false;
    }

    // Sort direction
    const sortDirection = pagination.sortOrder === 'asc' ? 1 : -1;
    const sortField = pagination.sortBy;

    // Execute paginated query
    const skip = (pagination.page - 1) * pagination.limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash -refreshTokens')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(pagination.limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return NextResponse.json(
      {
        users,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[GET /api/usuarios] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar usuarios.' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/usuarios - Create a user (admin only)
// ---------------------------------------------------------------------------

export const POST = withAdmin(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    const parsed = adminCreateUserSchema.safeParse(sanitizedBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Dados do usuario invalidos.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email: rawEmail, password, role, cpf, crm, isActive } = parsed.data;

    // Sanitize email
    const email = sanitizeEmail(rawEmail);
    if (!email) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Email invalido.' },
        { status: 400 },
      );
    }

    await connectDB();

    // Check if email is already taken
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return NextResponse.json(
        { error: 'EMAIL_EXISTS', message: 'Este email ja esta cadastrado.' },
        { status: 409 },
      );
    }

    // Hash password (12 rounds as per CLAUDE.md spec)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      protocolId: generateProtocolId('user'),
      name,
      email,
      passwordHash,
      role: role || 'user',
      cpf: cpf || null,
      crm: crm || null,
      isActive: isActive ?? true,
    });

    // Audit log
    const ip = getClientIP(req);
    await AuditLog.create({
      user: req.user.userId,
      action: 'user_created',
      resource: 'user',
      resourceId: user._id.toString(),
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || null,
      metadata: {
        createdUserEmail: email,
        createdUserRole: role || 'user',
      },
    });

    // Return user without password
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
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/usuarios] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao criar usuario.' },
      { status: 500 },
    );
  }
});
