import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import SerialKey from '@/lib/db/models/SerialKey';
import User from '@/lib/db/models/User';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAuth, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';
import { activateSerialKeySchema } from '@/lib/utils/validators';
import { sanitizeObject } from '@/lib/security/sanitize';

// ---------------------------------------------------------------------------
// POST /api/serial-keys/activate - Activate a serial key (authenticated user)
// ---------------------------------------------------------------------------

export const POST = withAuth(async (req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    const parsed = activateSerialKeySchema.safeParse(sanitizedBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Chave serial invalida.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    await connectDB();

    const { key } = parsed.data;
    const userId = req.user.userId;

    // Find the serial key
    const serialKey = await SerialKey.findOne({ key: key.toUpperCase() });

    if (!serialKey) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Chave serial nao encontrada.' },
        { status: 404 },
      );
    }

    // Check if already used by this user
    const alreadyUsed = serialKey.usedBy.some(
      (u) => u.user.toString() === userId,
    );
    if (alreadyUsed) {
      return NextResponse.json(
        { error: 'ALREADY_USED', message: 'Voce ja utilizou esta chave serial.' },
        { status: 400 },
      );
    }

    // Check validity
    if (serialKey.status === 'revoked') {
      return NextResponse.json(
        { error: 'REVOKED', message: 'Esta chave serial foi revogada.' },
        { status: 400 },
      );
    }

    if (serialKey.expiresAt && serialKey.expiresAt.getTime() < Date.now()) {
      // Auto-update status
      if (serialKey.status === 'active') {
        serialKey.status = 'expired';
        await serialKey.save();
      }
      return NextResponse.json(
        { error: 'EXPIRED', message: 'Esta chave serial expirou.' },
        { status: 400 },
      );
    }

    if (serialKey.maxUses !== null && serialKey.usedCount >= serialKey.maxUses) {
      if (serialKey.status === 'active') {
        serialKey.status = 'exhausted';
        await serialKey.save();
      }
      return NextResponse.json(
        { error: 'EXHAUSTED', message: 'Esta chave serial ja atingiu o limite de usos.' },
        { status: 400 },
      );
    }

    // Grant course access to user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'Usuario nao encontrado.' },
        { status: 404 },
      );
    }

    const now = new Date();
    const grantedCursos: string[] = [];

    for (const cursoAccess of serialKey.cursos) {
      const cursoId = cursoAccess.curso.toString();

      // Calculate expiration based on access duration
      let expiresAt: Date | null = null;
      if (cursoAccess.accessDurationMinutes) {
        expiresAt = new Date(now.getTime() + cursoAccess.accessDurationMinutes * 60 * 1000);
      }

      // Add to cursosAccess
      user.cursosAccess.push({
        curso: cursoAccess.curso,
        grantedAt: now,
        expiresAt,
        source: 'serial-key',
        sourceRef: serialKey.protocolId,
      });

      // Also add to legacy cursos array if not already there
      if (!user.cursos.some((c) => c.toString() === cursoId)) {
        user.cursos.push(cursoAccess.curso);
      }

      grantedCursos.push(cursoId);
    }

    await user.save();

    // Update serial key usage
    serialKey.usedCount += 1;
    serialKey.usedBy.push({ user: user._id, usedAt: now });
    if (serialKey.maxUses !== null && serialKey.usedCount >= serialKey.maxUses) {
      serialKey.status = 'exhausted';
    }
    await serialKey.save();

    // Audit log
    await AuditLog.create({
      user: userId,
      action: 'serial_key_activated',
      resource: 'serial_key',
      resourceId: serialKey._id.toString(),
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      metadata: {
        serialKeyProtocolId: serialKey.protocolId,
        grantedCursos,
      },
    });

    // Populate cursos for response
    await serialKey.populate('cursos.curso', 'name protocolId');

    return NextResponse.json({
      message: 'Chave serial ativada com sucesso!',
      cursosGranted: serialKey.cursos.map((c) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name: (c.curso as any)?.name || 'Curso',
        accessDurationMinutes: c.accessDurationMinutes,
      })),
    });
  } catch (error) {
    console.error('[POST /api/serial-keys/activate] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao ativar chave serial.' },
      { status: 500 },
    );
  }
});
