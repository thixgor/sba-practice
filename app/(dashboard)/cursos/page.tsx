"use client";

import { useEffect, useState } from "react";
import { CursoCard } from "@/components/dashboard/CursoCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Search, BookOpen } from "lucide-react";

interface Curso {
  _id: string;
  name: string;
  description: string;
  imageUrl?: string;
  duracao?: number;
  avaliacoes: unknown[];
  hasAccess?: boolean;
}

export default function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cursos", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCursos(data.cursos || []))
      .catch(() => setCursos([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = cursos.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Cursos</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Explore os cursos disponíveis e acompanhe seu progresso.
        </p>
      </motion.div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar cursos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-muted/50 border-border/50"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl skeleton-sba" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Nenhum curso encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Tente uma busca diferente." : "Nenhum curso disponível no momento."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((curso, i) => (
            <CursoCard
              key={curso._id}
              id={curso._id}
              name={curso.name}
              description={curso.description}
              imageUrl={curso.imageUrl}
              duracao={curso.duracao}
              avaliacoesTotal={curso.avaliacoes?.length || 0}
              avaliacoesConcluidas={0}
              index={i}
              locked={curso.hasAccess === false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
