"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  ClipboardList,
  Pencil,
  XCircle,
  Upload,
} from "lucide-react";
import { ImportQuestoesTxt } from "@/components/admin/ImportQuestoesTxt";

interface Avaliacao {
  _id: string;
  protocolId: string;
  name: string;
  tipo: string;
  curso?: { name: string };
  questoes: unknown[];
  isActive: boolean;
  createdAt: string;
}

const tipoColors: Record<string, string> = {
  "pre-teste": "bg-blue-500/10 text-blue-600",
  "pos-teste": "bg-green-500/10 text-green-600",
  prova: "bg-primary/10 text-primary",
  simulacao: "bg-purple-500/10 text-purple-600",
  "prova-video": "bg-sba-orange/10 text-sba-orange",
  "simulado-evolutivo": "bg-rose-500/10 text-rose-600",
};

export default function AdminAvaliacoesPage() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [importTarget, setImportTarget] = useState<Avaliacao | null>(null);

  const fetchAvaliacoes = () => {
    setLoading(true);
    fetch("/api/avaliacoes", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAvaliacoes(data.avaliacoes || []))
      .catch(() => toast.error("Erro ao carregar avaliações"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAvaliacoes(); }, []);

  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/avaliacoes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Avaliação desativada");
        fetchAvaliacoes();
      }
    } catch {
      toast.error("Erro ao desativar");
    }
  };

  const filtered = avaliacoes.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipoFilter === "all" || a.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-sba-orange" />
            <h1 className="text-2xl font-bold tracking-tight">Gerenciar Avaliações</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Crie, edite e gerencie as avaliações do sistema.
          </p>
        </div>
        <Link href="/admin/avaliacoes/nova">
          <Button className="bg-sba-orange hover:bg-sba-orange/90 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Nova Avaliação
          </Button>
        </Link>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar avaliações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-muted/50 border-border/50"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[180px] bg-muted/50 border-border/50">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="pre-teste">Pré-Teste</SelectItem>
            <SelectItem value="pos-teste">Pós-Teste</SelectItem>
            <SelectItem value="prova">Prova</SelectItem>
            <SelectItem value="simulacao">Simulação</SelectItem>
            <SelectItem value="prova-video">Prova de Vídeo</SelectItem>
            <SelectItem value="simulado-evolutivo">Simulado Evolutivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg skeleton-sba" />
          ))}
        </div>
      ) : (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Nome</TableHead>
                  <TableHead className="text-xs font-semibold">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold">Curso</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Questões</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      Nenhuma avaliação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((av) => (
                    <TableRow key={av._id}>
                      <TableCell className="text-sm font-medium">{av.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[10px] font-semibold", tipoColors[av.tipo] || "")}>
                          {av.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {av.curso?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-center">{av.questoes?.length || 0}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[10px]", av.isActive ? "bg-sba-success/10 text-sba-success" : "bg-muted text-muted-foreground")}>
                          {av.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Importar questões via TXT"
                            onClick={() => setImportTarget(av)}
                          >
                            <Upload className="h-3.5 w-3.5" />
                          </Button>
                          <Link href={`/admin/avaliacoes/${av._id}/editar`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          {av.isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-sba-error hover:text-sba-error"
                              onClick={() => handleDeactivate(av._id)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Import TXT Dialog */}
      {importTarget && (
        <ImportQuestoesTxt
          avaliacaoId={importTarget._id}
          avaliacaoTipo={importTarget.tipo}
          open={!!importTarget}
          onOpenChange={(open) => { if (!open) setImportTarget(null); }}
          onImportSuccess={() => {
            fetchAvaliacoes();
            setImportTarget(null);
          }}
        />
      )}
    </div>
  );
}
