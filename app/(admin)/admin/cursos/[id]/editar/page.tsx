"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ArrowLeft,
  Save,
  Trash2,
  Image as ImageIcon,
  Clock,
  FileText,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CursoData {
  _id: string;
  protocolId: string;
  name: string;
  description: string;
  imageUrl?: string;
  duracao?: number;
  avaliacoes: Array<{ _id: string; name: string; tipo: string }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function EditarCursoPage() {
  const params = useParams();
  const router = useRouter();
  const cursoId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [curso, setCurso] = useState<CursoData | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    duracao: "",
    imageUrl: "",
    isActive: true,
  });

  const fetchCurso = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cursos/${cursoId}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Curso nao encontrado");

      const data = await res.json();
      const c = data.curso || data;
      setCurso(c);
      setForm({
        name: c.name || "",
        description: c.description || "",
        duracao: c.duracao ? String(c.duracao) : "",
        imageUrl: c.imageUrl || "",
        isActive: c.isActive ?? true,
      });
    } catch {
      toast.error("Erro ao carregar dados do curso.");
      // Mock data for development
      const mockCurso: CursoData = {
        _id: cursoId,
        protocolId: "SBA-2026-C001",
        name: "Anestesia Regional Avancada",
        description:
          "Curso completo sobre tecnicas avancadas de bloqueio regional, incluindo guia por ultrassom e neurostimulacao.",
        duracao: 40,
        imageUrl: "",
        avaliacoes: [
          { _id: "av1", name: "Pre-teste Modulo 1", tipo: "pre-teste" },
          { _id: "av2", name: "Pos-teste Modulo 1", tipo: "pos-teste" },
          { _id: "av3", name: "Prova Final", tipo: "prova" },
        ],
        isActive: true,
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      };
      setCurso(mockCurso);
      setForm({
        name: mockCurso.name,
        description: mockCurso.description,
        duracao: mockCurso.duracao ? String(mockCurso.duracao) : "",
        imageUrl: mockCurso.imageUrl || "",
        isActive: mockCurso.isActive,
      });
    } finally {
      setLoading(false);
    }
  }, [cursoId]);

  useEffect(() => {
    fetchCurso();
  }, [fetchCurso]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("O nome do curso e obrigatorio.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name,
        description: form.description,
        duracao: form.duracao ? parseInt(form.duracao) : null,
        imageUrl: form.imageUrl || null,
        isActive: form.isActive,
      };

      const res = await fetch(`/api/cursos/${cursoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao salvar curso");
      }

      toast.success("Curso atualizado com sucesso!");
      router.push("/admin/cursos");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar curso";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  function getTipoBadgeColor(tipo: string) {
    switch (tipo) {
      case "pre-teste":
        return "bg-sba-cyan/10 text-sba-cyan";
      case "pos-teste":
        return "bg-sba-success/10 text-sba-success";
      case "prova":
        return "bg-sba-orange/10 text-sba-orange";
      case "prova-video":
        return "bg-purple-500/10 text-purple-500";
      case "simulacao":
        return "bg-sba-warning/10 text-sba-warning";
      default:
        return "";
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-80 rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        {...fadeInUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Link href="/admin/cursos">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar Curso</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {curso?.protocolId}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/cursos")}
          >
            Cancelar
          </Button>
          <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Alteracoes
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <motion.div
          className="lg:col-span-2 space-y-6"
          {...fadeInUp}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Informacoes do Curso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome do Curso *</Label>
                <Input
                  id="edit-name"
                  placeholder="Nome do curso"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-desc">Descricao</Label>
                <Textarea
                  id="edit-desc"
                  placeholder="Descreva o conteudo e objetivos do curso..."
                  rows={5}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-duracao">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Duracao (horas)
                  </Label>
                  <Input
                    id="edit-duracao"
                    type="number"
                    placeholder="Ex: 40"
                    min="1"
                    value={form.duracao}
                    onChange={(e) =>
                      setForm({ ...form, duracao: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-image">
                    <ImageIcon className="h-3 w-3 inline mr-1" />
                    URL da Imagem
                  </Label>
                  <Input
                    id="edit-image"
                    placeholder="https://..."
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm({ ...form, imageUrl: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Image Preview */}
              {form.imageUrl && (
                <div className="rounded-lg border border-border/50 overflow-hidden h-40 bg-muted/50">
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Curso Ativo</p>
                    <p className="text-xs text-muted-foreground">
                      Visivel para os usuarios
                    </p>
                  </div>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, isActive: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Criado em</span>
                    <span>
                      {curso?.createdAt
                        ? new Date(curso.createdAt).toLocaleDateString("pt-BR")
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Atualizado em</span>
                    <span>
                      {curso?.updatedAt
                        ? new Date(curso.updatedAt).toLocaleDateString("pt-BR")
                        : "-"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Linked Assessments */}
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Avaliacoes Vinculadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {curso?.avaliacoes && curso.avaliacoes.length > 0 ? (
                  <div className="space-y-2">
                    {curso.avaliacoes.map((av) => (
                      <div
                        key={av._id}
                        className="flex items-center justify-between rounded-lg border border-border/50 p-2.5"
                      >
                        <span className="text-xs font-medium truncate flex-1">
                          {av.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ml-2 ${getTipoBadgeColor(av.tipo)}`}
                        >
                          {av.tipo}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhuma avaliacao vinculada.
                  </p>
                )}
                <Link href="/admin/avaliacoes/nova">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 gap-1 text-xs"
                  >
                    <FileText className="h-3 w-3" />
                    Criar Avaliacao para este Curso
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
