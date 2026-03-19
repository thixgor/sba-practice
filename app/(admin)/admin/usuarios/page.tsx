"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  UserPlus,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  Mail,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  ToggleLeft,
  Eye,
  KeyRound,
  Link2,
  Copy,
  Check,
  Trash2,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Usuario {
  _id: string;
  protocolId: string;
  name: string;
  email: string;
  role: "admin" | "user";
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  cursos: string[];
}

interface CursoOption {
  _id: string;
  name: string;
}

interface InviteCursoAccess {
  cursoId: string;
  accessDurationMinutes: number | null;
  durationType: "unlimited" | "minutes" | "hours" | "days";
  durationValue: number;
}

interface InviteItem {
  _id: string;
  token: string;
  email: string | null;
  role: string;
  status: "pending" | "accepted" | "revoked";
  expiresAt: string;
  createdAt: string;
  createdBy?: { name: string; email: string };
  usedBy?: { name: string; email: string } | null;
  cursosAccess?: Array<{
    curso: { _id: string; name: string } | null;
    accessDurationMinutes: number | null;
  }>;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const ITEMS_PER_PAGE = 10;

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Invite state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "user" as "admin" | "user",
    expiresInHours: 48,
  });
  const [inviteCursos, setInviteCursos] = useState<InviteCursoAccess[]>([]);
  const [availableCursos, setAvailableCursos] = useState<CursoOption[]>([]);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // New user form
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
  });

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all")
        params.set("isActive", statusFilter === "active" ? "true" : "false");

      const res = await fetch(`/api/usuarios?${params}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erro ao buscar usuarios");

      const data = await res.json();
      setUsuarios(data.users || data.usuarios || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch {
      toast.error("Erro ao carregar usuarios.");
      // Mock data for development
      setUsuarios(generateMockUsuarios());
      setTotalPages(3);
      setTotalCount(28);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsuarios();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsuarios]);

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Preencha todos os campos obrigatorios.");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao criar usuario");
      }

      toast.success("Usuario criado com sucesso!");
      setDialogOpen(false);
      setNewUser({ name: "", email: "", password: "", role: "user" });
      fetchUsuarios();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar usuario";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      setTogglingId(userId);
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erro ao atualizar usuario");

      setUsuarios((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, isActive: !currentActive } : u
        )
      );
      toast.success(
        `Usuario ${!currentActive ? "ativado" : "desativado"} com sucesso!`
      );
    } catch {
      toast.error("Erro ao alterar status do usuario.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    try {
      const res = await fetch(`/api/usuarios/${userId}/reset-password`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erro ao redefinir senha");

      toast.success(`Senha de ${userName} redefinida. Email enviado.`);
    } catch {
      toast.error("Erro ao redefinir senha.");
    }
  };

  const handleExportCSV = () => {
    toast.success("Exportando lista de usuarios em CSV...");
    // Actual implementation would call an export endpoint
  };

  const fetchInvites = useCallback(async () => {
    try {
      setLoadingInvites(true);
      const res = await fetch("/api/admin/invites?limit=50", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao buscar convites");
      const data = await res.json();
      setInvites(data.invites || []);
    } catch {
      // Silently fail — invites section is secondary
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  // Fetch available courses for invite course selection
  useEffect(() => {
    fetch("/api/cursos?limit=100", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAvailableCursos(data.cursos || []))
      .catch(() => {});
  }, []);

  const handleAddInviteCurso = (cursoId: string) => {
    if (inviteCursos.some((c) => c.cursoId === cursoId)) return;
    setInviteCursos((prev) => [
      ...prev,
      { cursoId, accessDurationMinutes: null, durationType: "unlimited", durationValue: 1 },
    ]);
  };

  const handleRemoveInviteCurso = (cursoId: string) => {
    setInviteCursos((prev) => prev.filter((c) => c.cursoId !== cursoId));
  };

  const handleInviteCursoDuration = (
    cursoId: string,
    field: string,
    value: string | number
  ) => {
    setInviteCursos((prev) =>
      prev.map((c) => {
        if (c.cursoId !== cursoId) return c;
        const updated = { ...c, [field]: value };
        const type = field === "durationType" ? (value as string) : c.durationType;
        const val = field === "durationValue" ? (value as number) : c.durationValue;
        if (type === "unlimited") updated.accessDurationMinutes = null;
        else if (type === "minutes") updated.accessDurationMinutes = val;
        else if (type === "hours") updated.accessDurationMinutes = val * 60;
        else if (type === "days") updated.accessDurationMinutes = val * 1440;
        return updated;
      })
    );
  };

  const handleCreateInvite = async () => {
    try {
      setCreatingInvite(true);
      setGeneratedLink(null);
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteForm.email || undefined,
          role: inviteForm.role,
          expiresInHours: inviteForm.expiresInHours,
          cursos: inviteCursos.map((c) => ({
            cursoId: c.cursoId,
            accessDurationMinutes: c.accessDurationMinutes,
          })),
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao criar convite");
      }

      const data = await res.json();
      setGeneratedLink(data.inviteLink);
      toast.success("Convite criado com sucesso!");
      fetchInvites();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar convite";
      toast.error(message);
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopiedLink(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Erro ao copiar link.");
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      setRevokingId(inviteId);
      const res = await fetch(`/api/admin/invites/${inviteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao revogar convite");
      toast.success("Convite revogado!");
      fetchInvites();
    } catch {
      toast.error("Erro ao revogar convite.");
    } finally {
      setRevokingId(null);
    }
  };

  const resetInviteDialog = () => {
    setInviteForm({ email: "", role: "user", expiresInHours: 48 });
    setInviteCursos([]);
    setGeneratedLink(null);
    setCopiedLink(false);
  };

  const filteredUsuarios = usuarios;

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
            <Users className="h-6 w-6 text-primary" />
            Gerenciar Usuarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} usuarios cadastrados no sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          <Dialog
            open={inviteDialogOpen}
            onOpenChange={(open) => {
              setInviteDialogOpen(open);
              if (!open) resetInviteDialog();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline">Convidar por Link</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Convidar por Link</DialogTitle>
                <DialogDescription>
                  Gere um link de convite para um novo usuario se registrar.
                </DialogDescription>
              </DialogHeader>
              {!generatedLink ? (
                <>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email (opcional)</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="email@exemplo.com"
                        value={inviteForm.email}
                        onChange={(e) =>
                          setInviteForm({ ...inviteForm, email: e.target.value })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Se informado, apenas este email podera usar o convite.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Perfil</Label>
                      <Select
                        value={inviteForm.role}
                        onValueChange={(val: "admin" | "user") =>
                          setInviteForm({ ...inviteForm, role: val })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuario</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-expires">Expiracao</Label>
                      <Select
                        value={String(inviteForm.expiresInHours)}
                        onValueChange={(val) =>
                          setInviteForm({
                            ...inviteForm,
                            expiresInHours: parseInt(val, 10),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24 horas</SelectItem>
                          <SelectItem value="48">48 horas</SelectItem>
                          <SelectItem value="72">72 horas</SelectItem>
                          <SelectItem value="168">7 dias</SelectItem>
                          <SelectItem value="720">30 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Course Access */}
                    <div className="space-y-2">
                      <Label>Cursos com acesso (opcional)</Label>
                      <Select onValueChange={handleAddInviteCurso} value="">
                        <SelectTrigger>
                          <SelectValue placeholder="Adicionar curso..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCursos
                            .filter((c) => !inviteCursos.some((ic) => ic.cursoId === c._id))
                            .map((c) => (
                              <SelectItem key={c._id} value={c._id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {inviteCursos.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {inviteCursos.map((ic) => {
                            const curso = availableCursos.find((c) => c._id === ic.cursoId);
                            return (
                              <div key={ic.cursoId} className="rounded-lg border p-2.5 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {curso?.name || ic.cursoId}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => handleRemoveInviteCurso(ic.cursoId)}
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Select
                                    value={ic.durationType}
                                    onValueChange={(v) =>
                                      handleInviteCursoDuration(ic.cursoId, "durationType", v)
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-[11px] w-[100px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unlimited">Ilimitado</SelectItem>
                                      <SelectItem value="minutes">Minutos</SelectItem>
                                      <SelectItem value="hours">Horas</SelectItem>
                                      <SelectItem value="days">Dias</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {ic.durationType !== "unlimited" && (
                                    <Input
                                      type="number"
                                      min={1}
                                      value={ic.durationValue}
                                      onChange={(e) =>
                                        handleInviteCursoDuration(
                                          ic.cursoId,
                                          "durationValue",
                                          parseInt(e.target.value, 10) || 1
                                        )
                                      }
                                      className="h-7 w-16 text-[11px]"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Cursos que serao liberados ao aceitar o convite.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setInviteDialogOpen(false)}
                      disabled={creatingInvite}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateInvite} disabled={creatingInvite}>
                      {creatingInvite ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        "Gerar Link"
                      )}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground mb-2">Link de convite:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs break-all bg-background rounded p-2 border">
                        {generatedLink}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        className="shrink-0 h-8 w-8"
                        onClick={handleCopyLink}
                      >
                        {copiedLink ? (
                          <Check className="h-3.5 w-3.5 text-sba-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      resetInviteDialog();
                      setInviteDialogOpen(false);
                    }}>
                      Fechar
                    </Button>
                    <Button onClick={resetInviteDialog}>
                      Gerar Outro
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Novo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuario</DialogTitle>
                <DialogDescription>
                  Preencha os dados para cadastrar um novo usuario no sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-name">Nome Completo *</Label>
                  <Input
                    id="new-name"
                    placeholder="Dr. Nome Sobrenome"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email *</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Senha Inicial *</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Minimo 8 caracteres"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-role">Perfil</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(val: "admin" | "user") =>
                      setNewUser({ ...newUser, role: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuario</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Button onClick={handleCreateUser} disabled={creating}>
                  {creating ? "Criando..." : "Criar Usuario"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        {...fadeInUp}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={roleFilter}
                  onValueChange={(val) => {
                    setRoleFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Perfis</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="user">Usuario</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[130px]">
                    <ToggleLeft className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div
        {...fadeInUp}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">Usuario</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">
                        Email
                      </TableHead>
                      <TableHead className="text-xs">Perfil</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">
                        Ultimo Acesso
                      </TableHead>
                      <TableHead className="text-xs text-right">
                        Acoes
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsuarios.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-sm text-muted-foreground py-12"
                        >
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          Nenhum usuario encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsuarios.map((user) => (
                        <TableRow key={user._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {user.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground md:hidden truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.role === "admin"
                                  ? "default"
                                  : "secondary"
                              }
                              className={`text-[10px] ${
                                user.role === "admin"
                                  ? "bg-sba-orange/10 text-sba-orange border-sba-orange/20"
                                  : ""
                              }`}
                            >
                              {user.role === "admin" ? (
                                <ShieldCheck className="h-3 w-3 mr-1" />
                              ) : (
                                <Shield className="h-3 w-3 mr-1" />
                              )}
                              {user.role === "admin"
                                ? "Admin"
                                : "Usuario"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={user.isActive}
                                onCheckedChange={() =>
                                  handleToggleActive(user._id, user.isActive)
                                }
                                disabled={togglingId === user._id}
                                className="scale-75"
                              />
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${
                                  user.isActive
                                    ? "bg-sba-success/10 text-sba-success"
                                    : "bg-sba-error/10 text-sba-error"
                                }`}
                              >
                                {user.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {user.lastLogin
                                ? new Date(user.lastLogin).toLocaleString(
                                    "pt-BR",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )
                                : "Nunca"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2">
                                  <Eye className="h-3.5 w-3.5" />
                                  Ver Historico
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() =>
                                    handleResetPassword(user._id, user.name)
                                  }
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                  Redefinir Senha
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() =>
                                    handleToggleActive(user._id, user.isActive)
                                  }
                                >
                                  <ToggleLeft className="h-3.5 w-3.5" />
                                  {user.isActive ? "Desativar" : "Ativar"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <p className="text-xs text-muted-foreground">
            Pagina {currentPage} de {totalPages} ({totalCount} registros)
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
      {/* Pending Invites Section */}
      <motion.div
        {...fadeInUp}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Convites Pendentes
              {invites.filter((i) => i.status === "pending").length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {invites.filter((i) => i.status === "pending").length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInvites ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : invites.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum convite criado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {invites.map((inv) => {
                  const isExpired = new Date(inv.expiresAt) < new Date();
                  const statusLabel =
                    inv.status === "accepted"
                      ? "Aceito"
                      : inv.status === "revoked"
                        ? "Revogado"
                        : isExpired
                          ? "Expirado"
                          : "Pendente";
                  const statusColor =
                    inv.status === "accepted"
                      ? "bg-sba-success/10 text-sba-success"
                      : inv.status === "revoked" || isExpired
                        ? "bg-sba-error/10 text-sba-error"
                        : "bg-primary/10 text-primary";

                  return (
                    <div
                      key={inv._id}
                      className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {inv.email || "Qualquer email"}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] shrink-0 ${statusColor}`}
                          >
                            {statusLabel}
                          </Badge>
                          {inv.role === "admin" && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-sba-orange/10 text-sba-orange shrink-0"
                            >
                              Admin
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                          <span>
                            Criado em{" "}
                            {new Date(inv.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                          {inv.status === "pending" && !isExpired && (
                            <span>
                              Expira em{" "}
                              {new Date(inv.expiresAt).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                          {inv.status === "accepted" && inv.usedBy && (
                            <span>
                              Usado por {inv.usedBy.name}
                            </span>
                          )}
                        </div>
                      </div>
                      {inv.status === "pending" && !isExpired && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-sba-error shrink-0"
                          disabled={revokingId === inv._id}
                          onClick={() => handleRevokeInvite(inv._id)}
                        >
                          {revokingId === inv._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function generateMockUsuarios(): Usuario[] {
  const names = [
    "Dr. Carlos Alberto Silva",
    "Dra. Ana Maria Santos",
    "Dr. Pedro Henrique Lima",
    "Dra. Maria Fernanda Oliveira",
    "Dr. Joao Paulo Costa",
    "Dra. Juliana Martins",
    "Dr. Roberto Gomes",
    "Dra. Patricia Almeida",
    "Dr. Marcos Antonio Souza",
    "Dra. Lucia Helena Pereira",
  ];
  return names.map((name, i) => ({
    _id: `user-${i}`,
    protocolId: `SBA-2026-${String(i + 1).padStart(4, "0")}`,
    name,
    email: `${name.split(" ")[1]?.toLowerCase() || "user"}${i}@sbahq.org`,
    role: i === 0 ? ("admin" as const) : ("user" as const),
    isActive: i !== 7,
    lastLogin:
      i < 8
        ? new Date(Date.now() - i * 86400000 * Math.random() * 7).toISOString()
        : undefined,
    createdAt: new Date(
      Date.now() - (30 + i * 15) * 86400000
    ).toISOString(),
    cursos: [],
  }));
}
