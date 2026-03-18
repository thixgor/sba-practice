"use client";

import { useEffect, useState } from "react";
import { AvaliacaoCard } from "@/components/dashboard/AvaliacaoCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Search, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const tipoFilters = [
  { value: "", label: "Todos" },
  { value: "pre-teste", label: "Pré-Teste" },
  { value: "pos-teste", label: "Pós-Teste" },
  { value: "prova", label: "Prova" },
  { value: "simulacao", label: "Simulação" },
  { value: "prova-video", label: "Prova de Vídeo" },
  { value: "simulado-evolutivo", label: "Simulado Evolutivo" },
];

interface Avaliacao {
  _id: string;
  name: string;
  description: string;
  tipo: "pre-teste" | "pos-teste" | "prova" | "simulacao" | "prova-video" | "simulado-evolutivo";
  questoes: unknown[];
  configuracao: { tempoLimiteMinutos?: number | null };
}

export default function AvaliacoesPage() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/avaliacoes", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAvaliacoes(data.avaliacoes || []))
      .catch(() => setAvaliacoes([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = avaliacoes.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = !tipoFilter || a.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Avaliações</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Confira as avaliações disponíveis e realize suas provas.
        </p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar avaliações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-muted/50 border-border/50"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {tipoFilters.map((f) => (
            <Badge
              key={f.value}
              variant="secondary"
              className={cn(
                "cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors",
                tipoFilter === f.value
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "hover:bg-muted"
              )}
              onClick={() => setTipoFilter(f.value)}
            >
              {f.label}
            </Badge>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl skeleton-sba" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma avaliação encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search || tipoFilter ? "Tente ajustar os filtros." : "Nenhuma avaliação disponível."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((av, i) => (
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
      )}
    </div>
  );
}
