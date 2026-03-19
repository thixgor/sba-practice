import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/mongoose';
import SerialKey from '@/lib/db/models/SerialKey';
import Curso from '@/lib/db/models/Curso';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { createSerialKeySchema } from '@/lib/utils/validators';
import { generateProtocolId } from '@/lib/utils/protocol';
import { sanitizeObject } from '@/lib/security/sanitize';

// ---------------------------------------------------------------------------
// POST /api/admin/serial-keys - Create a serial key (admin only)
// ---------------------------------------------------------------------------

export const POST = withAdmin(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    const parsed = createSerialKeySchema.safeParse(sanitizedBody);

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

    await connectDB();

    const { cursos, expiresInMinutes, maxUses, label } = parsed.data;

    // Validate all course IDs exist
    const cursoIds = cursos.map((c) => c.cursoId);
    const existingCursos = await Curso.find({ _id: { $in: cursoIds } }).lean();
    if (existingCursos.length !== cursoIds.length) {
      return NextResponse.json(
        { error: 'INVALID_COURSE', message: 'Um ou mais cursos informados nao existem.' },
        { status: 400 },
      );
    }

    // Generate SHA-256 key
    const randomBytes = crypto.randomBytes(32);
    const key = crypto.createHash('sha256').update(randomBytes).digest('hex').toUpperCase();

    const protocolId = generateProtocolId('serialkey');

    const expiresAt = expiresInMinutes
      ? new Date(Date.now() + expiresInMinutes * 60 * 1000)
      : null;

    const serialKey = await SerialKey.create({
      protocolId,
      key,
      cursos: cursos.map((c) => ({
        curso: c.cursoId,
        accessDurationMinutes: c.accessDurationMinutes || null,
      })),
      expiresAt,
      maxUses: maxUses || null,
      status: 'active',
      label: label || null,
      createdBy: req.user.userId,
    });

    // Populate cursos for response
    await serialKey.populate('cursos.curso', 'name protocolId');

    // Audit log
    await AuditLog.create({
      user: req.user.userId,
      action: 'serial_key_created',
      resource: 'serial_key',
      resourceId: serialKey._id.toString(),
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      metadata: { protocolId, label, cursosCount: cursos.length, maxUses },
    });

    return NextResponse.json({ serialKey }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/serial-keys] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao criar serial key.' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/serial-keys - List serial keys (admin only)
// ---------------------------------------------------------------------------

export const GET = withAdmin(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const filter: Record<string, unknown> = {};
    if (status && ['active', 'expired', 'revoked', 'exhausted'].includes(status)) {
      filter.status = status;
    }

    const [serialKeys, total] = await Promise.all([
      SerialKey.find(filter)
        .populate('cursos.curso', 'name protocolId')
        .populate('createdBy', 'name email')
        .populate('usedBy.user', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SerialKey.countDocuments(filter),
    ]);

    return NextResponse.json({
      serialKeys,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/serial-keys] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao listar serial keys.' },
      { status: 500 },
    );
  }
});
