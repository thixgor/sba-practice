import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import Curso from '@/lib/db/models/Curso';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Tentativa from '@/lib/db/models/Tentativa';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAdmin, type AuthenticatedRequest, type RouteContext } from '@/lib/auth/middleware';

// ---------------------------------------------------------------------------
// GET /api/admin/stats - Admin dashboard statistics
// ---------------------------------------------------------------------------

export const GET = withAdmin(async (_req: AuthenticatedRequest, _ctx: RouteContext) => {
  try {
    await connectDB();

    // Build date boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Execute all queries in parallel for performance
    const [
      totalUsers,
      activeUsers,
      totalCursos,
      activeCursos,
      totalAvaliacoes,
      activeAvaliacoes,
      totalTentativas,
      tentativasToday,
      tentativasLast7Days,
      tentativasLast30Days,
      finalizadas,
      recentAuditLogs,
      averageScoreResult,
      tentativasByStatus,
    ] = await Promise.all([
      // User stats
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),

      // Curso stats
      Curso.countDocuments({}),
      Curso.countDocuments({ isActive: true }),

      // Avaliacao stats
      Avaliacao.countDocuments({}),
      Avaliacao.countDocuments({ isActive: true }),

      // Tentativa stats
      Tentativa.countDocuments({}),
      Tentativa.countDocuments({ iniciadaEm: { $gte: todayStart } }),
      Tentativa.countDocuments({ iniciadaEm: { $gte: last7Days } }),
      Tentativa.countDocuments({ iniciadaEm: { $gte: last30Days } }),
      Tentativa.countDocuments({ status: 'finalizada' }),

      // Recent audit logs (security alerts)
      AuditLog.find({
        action: { $in: ['login_failed', 'login_success', 'user_created', 'tentativa_finalized'] },
      })
        .sort({ timestamp: -1 })
        .limit(20)
        .populate('user', 'name email')
        .lean(),

      // Average score across all finalized attempts
      Tentativa.aggregate([
        { $match: { status: 'finalizada', percentualAcerto: { $ne: null } } },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$percentualAcerto' },
            minScore: { $min: '$percentualAcerto' },
            maxScore: { $max: '$percentualAcerto' },
          },
        },
      ]),

      // Tentativas by status breakdown
      Tentativa.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Process aggregate results
    const avgStats = averageScoreResult[0] || { avgScore: 0, minScore: 0, maxScore: 0 };
    const statusBreakdown: Record<string, number> = {};
    for (const item of tentativasByStatus) {
      statusBreakdown[item._id as string] = item.count as number;
    }

    // Count security alerts (failed logins in last 24h)
    const securityAlerts = recentAuditLogs.filter(
      (log) => log.action === 'login_failed',
    ).length;

    return NextResponse.json(
      {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        cursos: {
          total: totalCursos,
          active: activeCursos,
        },
        avaliacoes: {
          total: totalAvaliacoes,
          active: activeAvaliacoes,
        },
        tentativas: {
          total: totalTentativas,
          today: tentativasToday,
          last7Days: tentativasLast7Days,
          last30Days: tentativasLast30Days,
          finalizadas,
          byStatus: statusBreakdown,
        },
        performance: {
          averageScore: Math.round((avgStats.avgScore || 0) * 100) / 100,
          minScore: avgStats.minScore || 0,
          maxScore: avgStats.maxScore || 0,
        },
        security: {
          recentAlerts: securityAlerts,
          recentLogs: recentAuditLogs,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[GET /api/admin/stats] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar estatisticas.' },
      { status: 500 },
    );
  }
});
