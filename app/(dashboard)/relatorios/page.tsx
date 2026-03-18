"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BarChart3,
  Search,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  Eye,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface TentativaHistorico {
  _id: string;
  protocolId: string;
  avaliacaoId: string;
  avaliacaoName: string;
  tipo: string;
  percentualAcerto: number;
  pontuacaoObtida: number;
  pontuacaoTotal: number;
  duracaoSegundos: number;
  finalizadaEm: string;
}

export default function RelatoriosPage() {
  const router = useRouter();
  const [tentativas, setTentativas] = useState<TentativaHistorico[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch("/api/tentativas", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTentativas(data.tentativas || []);
      })
      .catch(() => setTentativas([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tentativas.filter((t) =>
    t.avaliacaoName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/tentativas", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Erro ao limpar relatórios");
      }
      const data = await res.json();
      setTentativas([]);
      setDialogOpen(false);
      toast.success(`${data.deleted || 0} relatório(s) removido(s) permanentemente.`);
    } catch {
      toast.error("Erro ao limpar relatórios. Tente novamente.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Meus Relatórios</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Histórico de todas as suas avaliações finalizadas.
            </p>
          </div>

          {/* Clear all reports button */}
          {tentativas.length > 0 && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sba-error border-sba-error/30 hover:bg-sba-error/10 hover:text-sba-error"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Relatórios
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-sba-error/10">
                    <AlertTriangle className="h-6 w-6 text-sba-error" />
                  </div>
                  <DialogTitle className="text-center">
                    Limpar todos os relatórios?
                  </DialogTitle>
                  <DialogDescription className="text-center space-y-2">
                    <span className="block">
                      Esta ação removerá <strong>permanentemente</strong> todos os seus{" "}
                      <strong>{tentativas.length}</strong> relatório(s) e respostas associadas.
                    </span>
                    <span className="block text-sba-error font-semibold">
                      Essa ação não pode ser desfeita.
                    </span>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
                  <DialogClose asChild>
                    <Button variant="outline" className="flex-1" disabled={clearing}>
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleClearAll}
                    disabled={clearing}
                  >
                    {clearing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {clearing ? "Removendo..." : "Sim, limpar tudo"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </motion.div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por avaliação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-muted/50 border-border/50"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl skeleton-sba" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">Nenhum relatório disponível</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Complete avaliações para ver seus relatórios aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t, i) => {
            const date = new Date(t.finalizadaEm);
            const mins = Math.floor(t.duracaoSegundos / 60);
            return (
              <motion.div
                key={t._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-border/50 bg-card/80 hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
                        t.percentualAcerto >= 70
                          ? "bg-sba-success/10"
                          : "bg-sba-error/10"
                      )}
                    >
                      {t.percentualAcerto >= 70 ? (
                        <CheckCircle2 className="h-6 w-6 text-sba-success" />
                      ) : (
                        <XCircle className="h-6 w-6 text-sba-error" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate">
                        {t.avaliacaoName}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px]">
                          {t.tipo}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {date.toLocaleDateString("pt-BR")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {mins}min
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={cn(
                          "text-lg font-bold",
                          t.percentualAcerto >= 70
                            ? "text-sba-success"
                            : "text-sba-error"
                        )}
                      >
                        {t.percentualAcerto}%
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.pontuacaoObtida}/{t.pontuacaoTotal}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-9 w-9"
                      title="Ver Detalhes"
                      onClick={() =>
                        router.push(
                          `/avaliacoes/${t.avaliacaoId}/resultado?tentativaId=${t._id}`
                        )
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
