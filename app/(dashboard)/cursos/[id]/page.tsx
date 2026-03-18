"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AvaliacaoCard } from "@/components/dashboard/AvaliacaoCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { BookOpen, Clock, ClipboardList, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CursoDetail {
  _id: string;
  name: string;
  description: string;
  duracao?: number;
  avaliacoes: Array<{
    _id: string;
    name: string;
    description: string;
    tipo: "pre-teste" | "pos-teste" | "prova" | "simulacao" | "prova-video" | "simulado-evolutivo";
    questoes: unknown[];
    configuracao: { tempoLimiteMinutos?: number | null };
  }>;
}

export default function CursoDetailPage() {
  const params = useParams();
  const [curso, setCurso] = useState<CursoDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/cursos/${params.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCurso(data.curso))
      .catch(() => setCurso(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 skeleton-sba" />
        <Skeleton className="h-40 rounded-xl skeleton-sba" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl skeleton-sba" />
          ))}
        </div>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-lg font-semibold">Curso não encontrado</h2>
        <Link href="/cursos" className="mt-4 text-sm text-primary hover:underline">
          Voltar para cursos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/cursos">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
        </Link>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{curso.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">{curso.description}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm text-muted-foreground">
              {curso.duracao && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{curso.duracao} horas</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <ClipboardList className="h-4 w-4" />
                <span>{curso.avaliacoes?.length || 0} avaliações</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold mb-4">Avaliações do Curso</h2>
        {curso.avaliacoes?.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {curso.avaliacoes.map((av, i) => (
              <AvaliacaoCard
                key={av._id}
                id={av._id}
                name={av.name}
                description={av.description}
                tipo={av.tipo}
                questoesCount={av.questoes?.length || 0}
                tempoLimite={av.configuracao?.tempoLimiteMinutos}
                index={i}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma avaliação disponível para este curso.
          </p>
        )}
      </div>
    </div>
  );
}
