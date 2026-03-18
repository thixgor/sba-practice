"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { CursoCard } from "@/components/dashboard/CursoCard";
import { AvaliacaoCard } from "@/components/dashboard/AvaliacaoCard";
import { EvolucaoChart } from "@/components/dashboard/EvolucaoChart";
import { PatientMonitorGauge } from "@/components/animations/PatientMonitorGauge";
import { VitalSignsBar } from "@/components/animations/VitalSignsBar";
import { MedicalDripAnimation } from "@/components/animations/MedicalDripAnimation";
import { BreathingCard } from "@/components/animations/BreathingCard";
import { ParticleField } from "@/components/animations/ParticleField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { BookOpen, ClipboardList, TrendingUp, Syringe } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface DashboardData {
  stats: {
    provasRealizadas: number;
    taxaAcerto: number;
    tempoMedio: string;
    medalhas: number;
  };
  cursos: Array<{
    _id: string;
    name: string;
    description: string;
    imageUrl?: string;
    duracao?: number;
    avaliacoesTotal: number;
    avaliacoesConcluidas: number;
  }>;
  avaliacoes: Array<{
    _id: string;
    name: string;
    description: string;
    tipo: "pre-teste" | "pos-teste" | "prova" | "simulacao" | "prova-video" | "simulado-evolutivo";
    questoesCount: number;
    tempoLimite?: number | null;
    status?: "pendente" | "realizada" | "em-andamento";
    percentualAcerto?: number;
  }>;
  evolucao: Array<{
    curso: string;
    preTeste: number;
    posTeste: number;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [cursosRes, avaliacoesRes, tentativasRes, evolucaoRes] = await Promise.all([
          fetch("/api/cursos", { credentials: "include" }),
          fetch("/api/avaliacoes", { credentials: "include" }),
          fetch("/api/tentativas", { credentials: "include" }),
          fetch("/api/dashboard/evolucao", { credentials: "include" }),
        ]);

        const cursosJson = cursosRes.ok ? await cursosRes.json() : { cursos: [] };
        const avaliacoesJson = avaliacoesRes.ok ? await avaliacoesRes.json() : { avaliacoes: [] };
        const tentativasJson = tentativasRes.ok ? await tentativasRes.json() : { tentativas: [] };
        const evolucaoJson = evolucaoRes.ok ? await evolucaoRes.json() : { evolucao: [] };

        const cursosList = cursosJson.cursos || [];
        const avaliacoesList = avaliacoesJson.avaliacoes || [];
        const tentativasList = tentativasJson.tentativas || [] as Array<{
          _id: string;
          avaliacaoId: string;
          percentualAcerto: number;
          duracaoSegundos: number;
        }>;

        // Compute real stats from tentativas
        const provasRealizadas = tentativasList.length;
        const taxaAcerto = provasRealizadas > 0
          ? Math.round(
              tentativasList.reduce(
                (sum: number, t: { percentualAcerto: number }) => sum + (t.percentualAcerto || 0),
                0
              ) / provasRealizadas
            )
          : 0;
        const totalSegundos = tentativasList.reduce(
          (sum: number, t: { duracaoSegundos: number }) => sum + (t.duracaoSegundos || 0),
          0
        );
        const tempoMedio = provasRealizadas > 0
          ? `${Math.round(totalSegundos / provasRealizadas / 60)}min`
          : "0min";

        // Build set of completed avaliacao IDs for status tracking
        const completedAvaliacaoIds = new Set(
          tentativasList.map((t: { avaliacaoId: string }) => t.avaliacaoId)
        );

        setData({
          stats: {
            provasRealizadas,
            taxaAcerto,
            tempoMedio,
            medalhas: tentativasList.filter(
              (t: { percentualAcerto: number }) => t.percentualAcerto >= 70
            ).length,
          },
          cursos: cursosList.map((c: Record<string, unknown>) => ({
            _id: c._id,
            name: c.name,
            description: c.description,
            imageUrl: c.imageUrl,
            duracao: c.duracao,
            avaliacoesTotal: (c.avaliacoes as unknown[])?.length || 0,
            avaliacoesConcluidas: 0,
          })),
          avaliacoes: avaliacoesList.map((a: Record<string, unknown>) => ({
            _id: a._id,
            name: a.name,
            description: a.description,
            tipo: a.tipo,
            questoesCount: (a.questoes as unknown[])?.length || 0,
            tempoLimite: (a.configuracao as Record<string, unknown>)?.tempoLimiteMinutos as number | null,
            status: completedAvaliacaoIds.has(a._id as string)
              ? ("realizada" as const)
              : ("pendente" as const),
          })),
          evolucao: evolucaoJson.evolucao || [],
        });
      } catch {
        setData({
          stats: { provasRealizadas: 0, taxaAcerto: 0, tempoMedio: "0min", medalhas: 0 },
          cursos: [],
          avaliacoes: [],
          evolucao: [],
        });
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl skeleton-sba" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-xl skeleton-sba lg:col-span-2" />
          <Skeleton className="h-72 rounded-xl skeleton-sba" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      {/* Background particles */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-30">
        <ParticleField particleCount={15} />
      </div>

      {/* Welcome card with medical theme */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10"
      >
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-r from-[#0A2463]/5 via-primary/5 to-transparent dark:from-[#0A2463]/20 dark:via-primary/10 dark:to-transparent">
          <CardContent className="p-0">
            <div className="flex items-stretch">
              {/* Left: text content */}
              <div className="flex-1 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Syringe className="h-5 w-5 text-primary" />
                  <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bem-vindo de volta, {user?.name?.split(" ")[0]}. Aqui esta seu panorama.
                </p>
                <div className="mt-3">
                  <VitalSignsBar
                    heartRate={72}
                    spO2={data?.stats.taxaAcerto || 98}
                  />
                </div>
              </div>
              {/* Right: simulation image */}
              <div className="hidden md:block relative w-[45%] lg:w-[50%] shrink-0">
                <Image
                  src="https://i.imgur.com/OQxzNzd.png"
                  alt="Simulação SBA - Sistema de Avaliações"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 45vw, 50vw"
                  priority
                />
                {/* Gradient fade from left so text blends into image */}
                <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-card/80 to-transparent pointer-events-none" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats grid */}
      <div className="relative z-10">
        <StatsGrid stats={data?.stats} />
      </div>

      {/* Chart + Gauge */}
      <div className="relative z-10 grid gap-6 lg:grid-cols-3">
        <BreathingCard delay={0} className="lg:col-span-2">
          <EvolucaoChart data={data?.evolucao || []} />
        </BreathingCard>
        <BreathingCard delay={1.5}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="h-full"
          >
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full flex flex-col items-center justify-center dark:shadow-[0_0_15px_-3px] dark:shadow-primary/10">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-center">
                  Performance Geral
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center pb-6">
                <PatientMonitorGauge
                  value={data?.stats.taxaAcerto || 0}
                  label="Acerto Geral"
                  size={160}
                />
              </CardContent>
            </Card>
          </motion.div>
        </BreathingCard>
      </div>

      {/* Cursos */}
      {data?.cursos && data.cursos.length > 0 && (
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Meus Cursos</h2>
            </div>
            <Link
              href="/cursos"
              className="text-xs text-primary hover:underline font-medium"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.cursos.slice(0, 3).map((curso, i) => (
              <CursoCard key={curso._id} {...curso} id={curso._id} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Avaliacoes disponiveis */}
      {data?.avaliacoes && data.avaliacoes.length > 0 && (
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Avaliações Disponíveis</h2>
            </div>
            <Link
              href="/avaliacoes"
              className="text-xs text-primary hover:underline font-medium"
            >
              Ver todas
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.avaliacoes.slice(0, 6).map((av, i) => (
              <AvaliacaoCard key={av._id} {...av} id={av._id} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {(!data?.cursos?.length && !data?.avaliacoes?.length) && (
        <motion.div className="relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma atividade ainda</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Você ainda não está inscrito em nenhum curso ou avaliação.
                Explore o catálogo para começar.
              </p>
              <div className="flex gap-3 mt-6">
                <Link href="/cursos">
                  <Badge variant="secondary" className="px-4 py-2 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                    Ver Cursos
                  </Badge>
                </Link>
                <Link href="/avaliacoes">
                  <Badge variant="secondary" className="px-4 py-2 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                    Ver Avaliações
                  </Badge>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
