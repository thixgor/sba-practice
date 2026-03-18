"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Search,
  Plus,
  Pencil,
  Clock,
  Users,
  FileText,
  ToggleLeft,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Curso {
  _id: string;
  protocolId: string;
  name: string;
  description: string;
  imageUrl?: string;
  duracao?: number;
  avaliacoes: string[];
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  _inscritosCount?: number;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function AdminCursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // New course form
  const [newCurso, setNewCurso] = useState({
    name: "",
    description: "",
    duracao: "",
    imageUrl: "",
  });

  const fetchCursos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("admin", "true");

      const res = await fetch(`/api/cursos?${params}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erro ao buscar cursos");

      const data = await res.json();
      setCursos(data.cursos || data.data || []);
    } catch {
      toast.error("Erro ao carregar cursos.");
      setCursos(generateMockCursos());
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCursos();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCursos]);

  const handleCreateCurso = async () => {
    if (!newCurso.name.trim()) {
      toast.error("O nome do curso e obrigatorio.");
      return;
    }

    try {
      setCreating(true);
      const payload = {
        name: newCurso.name,
        description: newCurso.description,
        duracao: newCurso.duracao ? parseInt(newCurso.duracao) : undefined,
        imageUrl: newCurso.imageUrl || undefined,
      };

      const res = await fetch("/api/cursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao criar curso");
      }

      toast.success("Curso criado com sucesso!");
      setDialogOpen(false);
      setNewCurso({ name: "", description: "", duracao: "", imageUrl: "" });
      fetchCursos();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar curso";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (cursoId: string, currentActive: boolean) => {
    try {
      setTogglingId(cursoId);
      const res = await fetch(`/api/cursos/${cursoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erro ao atualizar curso");

      setCursos((prev) =>
        prev.map((c) =>
          c._id === cursoId ? { ...c, isActive: !currentActive } : c
        )
      );
      toast.success(
        `Curso ${!currentActive ? "ativado" : "desativado"} com sucesso!`
      );
    } catch {
      toast.error("Erro ao alterar status do curso.");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredCursos = cursos.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        {...fadeInUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Gerenciar Cursos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {cursos.length} cursos cadastrados
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Curso
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Novo Curso</DialogTitle>
              <DialogDescription>
                Preencha os dados para cadastrar um novo curso.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="curso-name">Nome do Curso *</Label>
                <Input
                  id="curso-name"
                  placeholder="Ex: Anestesia Regional Avancada"
                  value={newCurso.name}
                  onChange={(e) =>
                    setNewCurso({ ...newCurso, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="curso-desc">Descricao</Label>
                <Textarea
                  id="curso-desc"
                  placeholder="Descreva o conteudo e objetivos do curso..."
                  rows={3}
                  value={newCurso.description}
                  onChange={(e) =>
                    setNewCurso({ ...newCurso, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="curso-duracao">Duracao (horas)</Label>
                  <Input
                    id="curso-duracao"
                    type="number"
                    placeholder="Ex: 40"
                    min="1"
                    value={newCurso.duracao}
                    onChange={(e) =>
                      setNewCurso({ ...newCurso, duracao: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="curso-image">URL da Imagem</Label>
                  <Input
                    id="curso-image"
                    placeholder="https://..."
                    value={newCurso.imageUrl}
                    onChange={(e) =>
                      setNewCurso({ ...newCurso, imageUrl: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateCurso} disabled={creating}>
                {creating ? "Criando..." : "Criar Curso"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Search */}
      <motion.div
        {...fadeInUp}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cursos..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Course Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : filteredCursos.length === 0 ? (
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                Nenhum curso encontrado.
              </p>
              <Button
                size="sm"
                className="mt-4 gap-2"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Criar Primeiro Curso
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCursos.map((curso, i) => (
            <motion.div
              key={curso._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              whileHover={{ y: -2 }}
            >
              <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-primary/5 h-full flex flex-col">
                {/* Top accent */}
                <div
                  className={`h-1 ${
                    curso.isActive
                      ? "bg-gradient-to-r from-primary via-primary/80 to-primary/40"
                      : "bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/10"
                  }`}
                />

                {/* Image placeholder */}
                <div className="h-32 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center overflow-hidden">
                  {curso.imageUrl ? (
                    <img
                      src={curso.imageUrl}
                      alt={curso.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-primary/30" />
                  )}
                </div>

                <CardContent className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm line-clamp-1 flex-1">
                      {curso.name}
                    </h3>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] shrink-0 ${
                        curso.isActive
                          ? "bg-sba-success/10 text-sba-success"
                          : "bg-sba-error/10 text-sba-error"
                      }`}
                    >
                      {curso.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
                    {curso.description || "Sem descricao"}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>{curso.avaliacoes?.length || 0} avaliacoes</span>
                    </div>
                    {curso.duracao && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{curso.duracao}h</span>
                      </div>
                    )}
                    {curso._inscritosCount !== undefined && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{curso._inscritosCount}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <Link href={`/admin/cursos/${curso._id}/editar`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 text-xs"
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() =>
                        handleToggleActive(curso._id, curso.isActive)
                      }
                      disabled={togglingId === curso._id}
                    >
                      <ToggleLeft className="h-3 w-3" />
                      {curso.isActive ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function generateMockCursos(): Curso[] {
  const cursos = [
    {
      name: "Anestesia Regional Avancada",
      description:
        "Curso completo sobre tecnicas avancadas de bloqueio regional, incluindo guia por ultrassom e neurostimulacao.",
      duracao: 40,
    },
    {
      name: "Anestesia Cardiovascular",
      description:
        "Manejo anestesico em cirurgias cardiacas, incluindo CEC e cirurgia minimamente invasiva.",
      duracao: 60,
    },
    {
      name: "Via Aerea Dificil",
      description:
        "Protocolos e tecnicas para manejo de via aerea dificil prevista e imprevista.",
      duracao: 20,
    },
    {
      name: "Anestesia Pediatrica",
      description:
        "Particularidades da anestesia em pacientes pediatricos, do neonato ao adolescente.",
      duracao: 50,
    },
    {
      name: "Dor Cronica",
      description:
        "Abordagem multimodal do tratamento da dor cronica, incluindo tecnicas intervencionistas.",
      duracao: 35,
    },
    {
      name: "Anestesia Obstetrica",
      description:
        "Anestesia e analgesia para parto e cesarea, emergencias obstetricas.",
      duracao: 30,
    },
  ];

  return cursos.map((c, i) => ({
    _id: `curso-${i}`,
    protocolId: `SBA-2026-C${String(i + 1).padStart(3, "0")}`,
    name: c.name,
    description: c.description,
    duracao: c.duracao,
    avaliacoes: Array.from(
      { length: Math.floor(Math.random() * 5) + 1 },
      (_, j) => `av-${j}`
    ),
    isActive: i !== 4,
    createdAt: new Date(
      Date.now() - (60 + i * 20) * 86400000
    ).toISOString(),
    updatedAt: new Date(
      Date.now() - i * 5 * 86400000
    ).toISOString(),
    _inscritosCount: Math.floor(Math.random() * 50) + 5,
  }));
}
