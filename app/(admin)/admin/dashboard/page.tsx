"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  FileText,
  ClipboardList,
  Target,
  Plus,
  UserPlus,
  BookOpen,
  Shield,
  Activity,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import Link from "next/link";

interface AdminStats {
  totalUsuarios: number;
  totalAvaliacoes: number;
  tentativasHoje: number;
  taxaMediaAcerto: number;
  usuariosAtivos: number;
  avaliacoesAtivas: number;
  tentativasSemana: number;
  cursosAtivos: number;
}

interface ActivityData {
  data: string;
  tentativas: number;
  usuarios: number;
}

interface AuditLog {
  _id: string;
  user: { name: string; email: string } | null;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  timestamp: string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar estatisticas");

      const data = await res.json();
      setStats(data.stats);
      setActivityData(data.activity || generateMockActivity());
      setAuditLogs(data.auditLogs || []);

      if (showRefresh) toast.success("Dados atualizados com sucesso!");
    } catch (err) {
      toast.error("Erro ao carregar dados do painel administrativo.");
      // Fallback mock data for development
      setStats({
        totalUsuarios: 156,
        totalAvaliacoes: 42,
        tentativasHoje: 28,
        taxaMediaAcerto: 72.5,
        usuariosAtivos: 134,
        avaliacoesAtivas: 38,
        tentativasSemana: 187,
        cursosAtivos: 12,
      });
      setActivityData(generateMockActivity());
      setAuditLogs(generateMockAuditLogs());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statCards = [
    {
      label: "Total de Usuarios",
      value: stats?.totalUsuarios ?? 0,
      icon: <Users className="h-5 w-5" />,
      color: "text-sba-cyan",
      bgColor: "bg-sba-cyan/10",
      gradient: "from-sba-cyan to-sba-cyan/0",
      href: "/admin/usuarios",
    },
    {
      label: "Avaliacoes Ativas",
      value: stats?.avaliacoesAtivas ?? 0,
      icon: <FileText className="h-5 w-5" />,
      color: "text-sba-orange",
      bgColor: "bg-sba-orange/10",
      gradient: "from-sba-orange to-sba-orange/0",
      href: "/admin/avaliacoes",
    },
    {
      label: "Tentativas Hoje",
      value: stats?.tentativasHoje ?? 0,
      icon: <ClipboardList className="h-5 w-5" />,
      color: "text-sba-success",
      bgColor: "bg-sba-success/10",
      gradient: "from-sba-success to-sba-success/0",
      href: "/admin/relatorios",
    },
    {
      label: "Taxa Media de Acerto",
      value: `${stats?.taxaMediaAcerto ?? 0}%`,
      icon: <Target className="h-5 w-5" />,
      color: "text-sba-warning",
      bgColor: "bg-sba-warning/10",
      gradient: "from-sba-warning to-sba-warning/0",
      href: "/admin/relatorios",
    },
  ];

  const quickActions = [
    {
      label: "Nova Avaliacao",
      icon: <Plus className="h-4 w-4" />,
      href: "/admin/avaliacoes/nova",
      variant: "default" as const,
    },
    {
      label: "Novo Usuario",
      icon: <UserPlus className="h-4 w-4" />,
      href: "/admin/usuarios",
      variant: "outline" as const,
    },
    {
      label: "Novo Curso",
      icon: <BookOpen className="h-4 w-4" />,
      href: "/admin/cursos",
      variant: "outline" as const,
    },
    {
      label: "Ver Relatorios",
      icon: <TrendingUp className="h-4 w-4" />,
      href: "/admin/relatorios",
      variant: "outline" as const,
    },
  ];

  function getActionBadgeVariant(action: string) {
    if (action.includes("login") || action.includes("LOGIN")) return "default";
    if (action.includes("create") || action.includes("CREATE"))
      return "secondary";
    if (action.includes("delete") || action.includes("DELETE"))
      return "destructive";
    if (action.includes("update") || action.includes("UPDATE"))
      return "outline";
    return "secondary";
  }

  function formatActionLabel(action: string) {
    const map: Record<string, string> = {
      LOGIN: "Login",
      LOGOUT: "Logout",
      CREATE_USER: "Criar Usuario",
      UPDATE_USER: "Atualizar Usuario",
      DELETE_USER: "Excluir Usuario",
      CREATE_AVALIACAO: "Criar Avaliacao",
      UPDATE_AVALIACAO: "Atualizar Avaliacao",
      CREATE_CURSO: "Criar Curso",
      INICIAR_TENTATIVA: "Iniciar Prova",
      FINALIZAR_TENTATIVA: "Finalizar Prova",
    };
    return map[action] || action;
  }

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        {...fadeInUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Painel Administrativo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visao geral do sistema SBA Practice
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Atualizar
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <Link href={stat.href}>
              <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-md hover:shadow-primary/5 cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold tracking-tight">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bgColor}`}
                    >
                      <span className={stat.color}>{stat.icon}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3 text-sba-success" />
                    <span>Ver detalhes</span>
                  </div>
                </CardContent>
                <div
                  className={`absolute bottom-0 left-0 h-0.5 w-full opacity-60 bg-gradient-to-r ${stat.gradient}`}
                />
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        {...fadeInUp}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Acoes Rapidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href}>
                  <Button variant={action.variant} size="sm" className="gap-2">
                    {action.icon}
                    {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts and Logs Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Chart */}
        <motion.div
          className="lg:col-span-2"
          {...fadeInUp}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Atividade dos Ultimos 30 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient
                        id="tentativasGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--sba-cyan)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--sba-cyan)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="usuariosGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--sba-orange)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--sba-orange)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="data"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "var(--foreground)" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tentativas"
                      stroke="var(--sba-cyan)"
                      strokeWidth={2}
                      fill="url(#tentativasGrad)"
                      name="Tentativas"
                    />
                    <Area
                      type="monotone"
                      dataKey="usuarios"
                      stroke="var(--sba-orange)"
                      strokeWidth={2}
                      fill="url(#usuariosGrad)"
                      name="Usuarios Ativos"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-sba-cyan" />
                  <span>Tentativas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-sba-orange" />
                  <span>Usuarios Ativos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Secondary Stats */}
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Resumo do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Usuarios Ativos
                </span>
                <span className="text-sm font-semibold">
                  {stats?.usuariosAtivos ?? 0}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Cursos Ativos
                </span>
                <span className="text-sm font-semibold">
                  {stats?.cursosAtivos ?? 0}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Avaliacoes Ativas
                </span>
                <span className="text-sm font-semibold">
                  {stats?.avaliacoesAtivas ?? 0}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Tentativas na Semana
                </span>
                <span className="text-sm font-semibold">
                  {stats?.tentativasSemana ?? 0}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Avaliacoes
                </span>
                <span className="text-sm font-semibold">
                  {stats?.totalAvaliacoes ?? 0}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Taxa Media
                </span>
                <Badge
                  variant="secondary"
                  className="bg-sba-success/10 text-sba-success text-xs"
                >
                  {stats?.taxaMediaAcerto ?? 0}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Audit Logs Table */}
      <motion.div
        {...fadeInUp}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-sba-warning" />
                Logs de Auditoria Recentes
              </CardTitle>
              <Link href="/admin/relatorios">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  Ver todos
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Usuario</TableHead>
                    <TableHead className="text-xs">Acao</TableHead>
                    <TableHead className="text-xs">Recurso</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">
                      IP
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Data/Hora
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        Nenhum log de auditoria encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.slice(0, 10).map((log) => (
                      <TableRow key={log._id}>
                        <TableCell className="text-sm">
                          <div>
                            <p className="font-medium text-xs">
                              {log.user?.name || "Sistema"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {log.user?.email || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getActionBadgeVariant(log.action)}
                            className="text-[10px]"
                          >
                            {formatActionLabel(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.resource}
                          {log.resourceId && (
                            <span className="ml-1 text-[10px] opacity-60">
                              #{log.resourceId.slice(-6)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                          {log.ipAddress || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(log.timestamp).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Skeleton loader
function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[380px] lg:col-span-2 rounded-xl" />
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  );
}

// Mock data generators for development
function generateMockActivity(): ActivityData[] {
  const data: ActivityData[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      data: date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      tentativas: Math.floor(Math.random() * 30) + 5,
      usuarios: Math.floor(Math.random() * 20) + 3,
    });
  }
  return data;
}

function generateMockAuditLogs(): AuditLog[] {
  const actions = [
    "LOGIN",
    "CREATE_USER",
    "UPDATE_AVALIACAO",
    "INICIAR_TENTATIVA",
    "FINALIZAR_TENTATIVA",
    "CREATE_CURSO",
    "LOGOUT",
  ];
  const resources = [
    "User",
    "Avaliacao",
    "Tentativa",
    "Curso",
    "Auth",
  ];
  const names = [
    "Dr. Carlos Silva",
    "Dra. Ana Santos",
    "Dr. Pedro Lima",
    "Admin SBA",
    "Dra. Maria Oliveira",
  ];

  return Array.from({ length: 10 }, (_, i) => ({
    _id: `log-${i}`,
    user: {
      name: names[i % names.length],
      email: `user${i}@sbahq.org`,
    },
    action: actions[i % actions.length],
    resource: resources[i % resources.length],
    resourceId: `res${Math.random().toString(36).slice(2, 8)}`,
    ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    timestamp: new Date(
      Date.now() - i * 3600000 * Math.random() * 5
    ).toISOString(),
  }));
}
