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
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  Loader2,
  Download,
  Eye,
  Clock,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface CursoOption {
  _id: string;
  name: string;
  protocolId: string;
}

interface SerialKeyItem {
  _id: string;
  protocolId: string;
  key: string;
  cursos: Array<{
    curso: { _id: string; name: string; protocolId: string } | null;
    accessDurationMinutes: number | null;
  }>;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  usedBy: Array<{
    user: { _id: string; name: string; email: string } | null;
    usedAt: string;
  }>;
  status: "active" | "expired" | "revoked" | "exhausted";
  label: string | null;
  createdBy: { _id: string; name: string; email: string } | null;
  createdAt: string;
}

interface CursoAccessForm {
  cursoId: string;
  accessDurationMinutes: number | null;
  accessDurationType: "unlimited" | "minutes" | "hours" | "days";
  accessDurationValue: number;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const ITEMS_PER_PAGE = 10;

function formatDuration(minutes: number | null): string {
  if (!minutes) return "Ilimitado";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(0)}h`;
  return `${(minutes / 1440).toFixed(0)} dias`;
}

function getStatusLabel(status: string, expiresAt: string | null): string {
  if (status === "revoked") return "Revogada";
  if (status === "exhausted") return "Esgotada";
  if (status === "expired" || (expiresAt && new Date(expiresAt) < new Date()))
    return "Expirada";
  return "Ativa";
}

function getStatusColor(status: string, expiresAt: string | null): string {
  const label = getStatusLabel(status, expiresAt);
  if (label === "Ativa") return "bg-sba-success/10 text-sba-success";
  if (label === "Esgotada") return "bg-sba-orange/10 text-sba-orange";
  return "bg-sba-error/10 text-sba-error";
}

export default function AdminSerialKeysPage() {
  const [serialKeys, setSerialKeys] = useState<SerialKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursos, setCursos] = useState<CursoOption[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<SerialKeyItem | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Details dialog
  const [detailKey, setDetailKey] = useState<SerialKeyItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Form state
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState<number>(1);
  const [keyExpirationType, setKeyExpirationType] = useState<"unlimited" | "minutes" | "hours" | "days">("unlimited");
  const [keyExpirationValue, setKeyExpirationValue] = useState(1);
  const [selectedCursos, setSelectedCursos] = useState<CursoAccessForm[]>([]);

  // Fetch courses for the selector
  useEffect(() => {
    fetch("/api/cursos?limit=100", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCursos(data.cursos || []))
      .catch(() => {});
  }, []);

  const fetchSerialKeys = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/serial-keys?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao buscar serial keys");
      const data = await res.json();
      setSerialKeys(data.serialKeys || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch {
      toast.error("Erro ao carregar serial keys.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchSerialKeys();
  }, [fetchSerialKeys]);

  const handleAddCurso = (cursoId: string) => {
    if (selectedCursos.some((c) => c.cursoId === cursoId)) return;
    setSelectedCursos((prev) => [
      ...prev,
      {
        cursoId,
        accessDurationMinutes: null,
        accessDurationType: "unlimited",
        accessDurationValue: 1,
      },
    ]);
  };

  const handleRemoveCurso = (cursoId: string) => {
    setSelectedCursos((prev) => prev.filter((c) => c.cursoId !== cursoId));
  };

  const handleCursoAccessChange = (
    cursoId: string,
    field: string,
    value: string | number
  ) => {
    setSelectedCursos((prev) =>
      prev.map((c) => {
        if (c.cursoId !== cursoId) return c;
        const updated = { ...c, [field]: value };
        // Recalculate minutes
        if (field === "accessDurationType" || field === "accessDurationValue") {
          const type = field === "accessDurationType" ? (value as string) : c.accessDurationType;
          const val = field === "accessDurationValue" ? (value as number) : c.accessDurationValue;
          if (type === "unlimited") {
            updated.accessDurationMinutes = null;
          } else if (type === "minutes") {
            updated.accessDurationMinutes = val;
          } else if (type === "hours") {
            updated.accessDurationMinutes = val * 60;
          } else if (type === "days") {
            updated.accessDurationMinutes = val * 1440;
          }
        }
        return updated;
      })
    );
  };

  const getExpirationMinutes = (): number | null => {
    if (keyExpirationType === "unlimited") return null;
    if (keyExpirationType === "minutes") return keyExpirationValue;
    if (keyExpirationType === "hours") return keyExpirationValue * 60;
    if (keyExpirationType === "days") return keyExpirationValue * 1440;
    return null;
  };

  const handleCreate = async () => {
    if (selectedCursos.length === 0) {
      toast.error("Selecione pelo menos um curso.");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/admin/serial-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cursos: selectedCursos.map((c) => ({
            cursoId: c.cursoId,
            accessDurationMinutes: c.accessDurationMinutes,
          })),
          expiresInMinutes: getExpirationMinutes(),
          maxUses: maxUses || null,
          label: label || null,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao criar serial key");
      }

      const data = await res.json();
      setCreatedKey(data.serialKey);
      toast.success("Serial key criada com sucesso!");
      fetchSerialKeys();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar serial key";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(true);
      toast.success("Chave copiada!");
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      toast.error("Erro ao copiar chave.");
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      setRevokingId(id);
      const res = await fetch(`/api/admin/serial-keys/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao revogar");
      toast.success("Serial key revogada!");
      fetchSerialKeys();
    } catch {
      toast.error("Erro ao revogar serial key.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleDownloadPDF = async (sk: SerialKeyItem) => {
    try {
      // Dynamic import to avoid large bundle
      const [{ default: jsPDF }, { default: QRCode }] = await Promise.all([
        import("jspdf"),
        import("qrcode"),
      ]);

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header background
      doc.setFillColor(1, 178, 187);
      doc.rect(0, 0, pageWidth, 45, "F");

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("SBA - Sociedade Brasileira", pageWidth / 2, 18, { align: "center" });
      doc.text("de Anestesiologia", pageWidth / 2, 28, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Serial Key de Acesso", pageWidth / 2, 38, { align: "center" });

      // Serial Key info
      let y = 60;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Protocolo:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(sk.protocolId, 55, y);

      y += 10;
      if (sk.label) {
        doc.setFont("helvetica", "bold");
        doc.text("Label:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(sk.label, 55, y);
        y += 10;
      }

      doc.setFont("helvetica", "bold");
      doc.text("Criada em:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(
        new Date(sk.createdAt).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        55,
        y
      );

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Validade:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(
        sk.expiresAt
          ? new Date(sk.expiresAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Sem expiracao",
        55,
        y
      );

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Usos:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(
        sk.maxUses ? `${sk.usedCount}/${sk.maxUses}` : `${sk.usedCount} (ilimitado)`,
        55,
        y
      );

      // Courses
      y += 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Cursos com acesso:", 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      for (const ca of sk.cursos) {
        const cursoName = ca.curso?.name || "Curso removido";
        const duration = formatDuration(ca.accessDurationMinutes);
        doc.text(`• ${cursoName} (${duration})`, 25, y);
        y += 7;
      }

      // Key box
      y += 10;
      doc.setDrawColor(1, 178, 187);
      doc.setLineWidth(1);
      doc.roundedRect(20, y, pageWidth - 40, 25, 3, 3, "S");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("SERIAL KEY:", pageWidth / 2, y + 8, { align: "center" });
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont("courier", "bold");
      // Split key to fit
      const keyPart1 = sk.key.substring(0, 32);
      const keyPart2 = sk.key.substring(32);
      doc.text(keyPart1, pageWidth / 2, y + 15, { align: "center" });
      doc.text(keyPart2, pageWidth / 2, y + 21, { align: "center" });

      // QR Code
      y += 35;
      const activationUrl = `${window.location.origin}/perfil?serial=${sk.key}`;
      const qrDataUrl = await QRCode.toDataURL(activationUrl, {
        width: 300,
        margin: 1,
        color: { dark: "#1E293B", light: "#FFFFFF" },
      });

      const qrSize = 50;
      doc.addImage(qrDataUrl, "PNG", (pageWidth - qrSize) / 2, y, qrSize, qrSize);

      y += qrSize + 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Escaneie o QR Code ou insira a chave no seu perfil para ativar o acesso.",
        pageWidth / 2,
        y,
        { align: "center" }
      );

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(
        "SBA - Sociedade Brasileira de Anestesiologia",
        pageWidth / 2,
        footerY,
        { align: "center" }
      );
      doc.text(
        "R. Professor Alfredo Gomes, 36 - Botafogo | Tel: (21) 3528-1050",
        pageWidth / 2,
        footerY + 4,
        { align: "center" }
      );
      doc.text(
        `Documento gerado em ${new Date().toLocaleDateString("pt-BR")}`,
        pageWidth / 2,
        footerY + 8,
        { align: "center" }
      );

      doc.save(`serial-key-${sk.protocolId}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Erro ao gerar PDF.");
    }
  };

  const resetCreateDialog = () => {
    setLabel("");
    setMaxUses(1);
    setKeyExpirationType("unlimited");
    setKeyExpirationValue(1);
    setSelectedCursos([]);
    setCreatedKey(null);
    setCopiedKey(false);
  };

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
            <KeyRound className="h-6 w-6 text-primary" />
            Serial Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} chaves no sistema
          </p>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) resetCreateDialog();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Serial Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Serial Key</DialogTitle>
              <DialogDescription>
                Gere uma chave de acesso para cursos especificos.
              </DialogDescription>
            </DialogHeader>

            {!createdKey ? (
              <>
                <div className="space-y-4 py-2">
                  {/* Label */}
                  <div className="space-y-2">
                    <Label>Label (opcional)</Label>
                    <Input
                      placeholder="Ex: Turma 2026-A"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                    />
                  </div>

                  {/* Course Selection */}
                  <div className="space-y-2">
                    <Label>Cursos *</Label>
                    <Select
                      onValueChange={handleAddCurso}
                      value=""
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Adicionar curso..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cursos
                          .filter(
                            (c) =>
                              !selectedCursos.some((sc) => sc.cursoId === c._id)
                          )
                          .map((c) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    {selectedCursos.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {selectedCursos.map((sc) => {
                          const curso = cursos.find((c) => c._id === sc.cursoId);
                          return (
                            <div
                              key={sc.cursoId}
                              className="rounded-lg border p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  {curso?.name || sc.cursoId}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleRemoveCurso(sc.cursoId)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-[11px] shrink-0">
                                  Duracao de acesso:
                                </Label>
                                <Select
                                  value={sc.accessDurationType}
                                  onValueChange={(val) =>
                                    handleCursoAccessChange(
                                      sc.cursoId,
                                      "accessDurationType",
                                      val
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs w-[110px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unlimited">
                                      Ilimitado
                                    </SelectItem>
                                    <SelectItem value="minutes">
                                      Minutos
                                    </SelectItem>
                                    <SelectItem value="hours">Horas</SelectItem>
                                    <SelectItem value="days">Dias</SelectItem>
                                  </SelectContent>
                                </Select>
                                {sc.accessDurationType !== "unlimited" && (
                                  <Input
                                    type="number"
                                    min={1}
                                    value={sc.accessDurationValue}
                                    onChange={(e) =>
                                      handleCursoAccessChange(
                                        sc.cursoId,
                                        "accessDurationValue",
                                        parseInt(e.target.value, 10) || 1
                                      )
                                    }
                                    className="h-8 w-20 text-xs"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Key Expiration */}
                  <div className="space-y-2">
                    <Label>Validade da serial key</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={keyExpirationType}
                        onValueChange={(v) =>
                          setKeyExpirationType(
                            v as "unlimited" | "minutes" | "hours" | "days"
                          )
                        }
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unlimited">Sem expiracao</SelectItem>
                          <SelectItem value="minutes">Minutos</SelectItem>
                          <SelectItem value="hours">Horas</SelectItem>
                          <SelectItem value="days">Dias</SelectItem>
                        </SelectContent>
                      </Select>
                      {keyExpirationType !== "unlimited" && (
                        <Input
                          type="number"
                          min={1}
                          value={keyExpirationValue}
                          onChange={(e) =>
                            setKeyExpirationValue(
                              parseInt(e.target.value, 10) || 1
                            )
                          }
                          className="w-24"
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Tempo que o usuario tem para ativar a chave.
                    </p>
                  </div>

                  {/* Max Uses */}
                  <div className="space-y-2">
                    <Label>Numero maximo de usos</Label>
                    <Input
                      type="number"
                      min={1}
                      value={maxUses}
                      onChange={(e) =>
                        setMaxUses(parseInt(e.target.value, 10) || 1)
                      }
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Quantos usuarios podem ativar esta chave.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                    disabled={creating}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      "Gerar Serial Key"
                    )}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="space-y-4 py-2">
                <div className="rounded-lg border bg-sba-success/5 border-sba-success/30 p-4 space-y-3">
                  <p className="text-sm font-medium text-sba-success">
                    Serial Key criada com sucesso!
                  </p>

                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      Protocolo:
                    </p>
                    <p className="text-sm font-mono">{createdKey.protocolId}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      Chave (SHA-256):
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[10px] break-all bg-background rounded p-2 border font-mono">
                        {createdKey.key}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        className="shrink-0 h-8 w-8"
                        onClick={() => handleCopyKey(createdKey.key)}
                      >
                        {copiedKey ? (
                          <Check className="h-3.5 w-3.5 text-sba-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Cursos:</p>
                    {createdKey.cursos.map((ca, i) => (
                      <p key={i} className="text-xs">
                        {ca.curso?.name || "Curso"} -{" "}
                        {formatDuration(ca.accessDurationMinutes)}
                      </p>
                    ))}
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadPDF(createdKey)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Baixar PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetCreateDialog();
                      setCreateOpen(false);
                    }}
                  >
                    Fechar
                  </Button>
                  <Button onClick={resetCreateDialog}>Criar Outra</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Filters */}
      <motion.div {...fadeInUp} transition={{ delay: 0.1, duration: 0.4 }}>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                  <SelectItem value="revoked">Revogadas</SelectItem>
                  <SelectItem value="exhausted">Esgotadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div {...fadeInUp} transition={{ delay: 0.2, duration: 0.4 }}>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Chave / Label</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">
                      Cursos
                    </TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">
                      Usos
                    </TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">
                      Validade
                    </TableHead>
                    <TableHead className="text-xs text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serialKeys.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-sm text-muted-foreground py-12"
                      >
                        <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhuma serial key encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    serialKeys.map((sk) => (
                      <TableRow key={sk._id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                              {sk.key.substring(0, 16)}...
                            </p>
                            {sk.label && (
                              <p className="text-sm font-medium truncate">
                                {sk.label}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              {sk.protocolId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {sk.cursos.map((ca, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                <BookOpen className="h-2.5 w-2.5 mr-1" />
                                {ca.curso?.name || "—"}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${getStatusColor(
                              sk.status,
                              sk.expiresAt
                            )}`}
                          >
                            {getStatusLabel(sk.status, sk.expiresAt)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {sk.usedCount}
                            {sk.maxUses && `/${sk.maxUses}`}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {sk.expiresAt
                              ? new Date(sk.expiresAt).toLocaleDateString(
                                  "pt-BR",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "2-digit",
                                  }
                                )
                              : "Sem exp."}
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
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => {
                                  setDetailKey(sk);
                                  setDetailOpen(true);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => handleCopyKey(sk.key)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Copiar Chave
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => handleDownloadPDF(sk)}
                              >
                                <Download className="h-3.5 w-3.5" />
                                Baixar PDF
                              </DropdownMenuItem>
                              {sk.status === "active" && (
                                <DropdownMenuItem
                                  className="gap-2 text-sba-error"
                                  onClick={() => handleRevoke(sk._id)}
                                  disabled={revokingId === sk._id}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Revogar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Detalhes da Serial Key
            </DialogTitle>
          </DialogHeader>
          {detailKey && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground">Protocolo</p>
                  <p className="font-mono text-xs">{detailKey.protocolId}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Status</p>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${getStatusColor(
                      detailKey.status,
                      detailKey.expiresAt
                    )}`}
                  >
                    {getStatusLabel(detailKey.status, detailKey.expiresAt)}
                  </Badge>
                </div>
                {detailKey.label && (
                  <div className="col-span-2">
                    <p className="text-[11px] text-muted-foreground">Label</p>
                    <p>{detailKey.label}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-muted-foreground">Criada em</p>
                  <p className="text-xs">
                    {new Date(detailKey.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Validade</p>
                  <p className="text-xs">
                    {detailKey.expiresAt
                      ? new Date(detailKey.expiresAt).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "Sem expiracao"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Usos
                  </p>
                  <p className="text-xs">
                    {detailKey.usedCount}
                    {detailKey.maxUses
                      ? ` de ${detailKey.maxUses}`
                      : " (ilimitado)"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Criada por</p>
                  <p className="text-xs">
                    {detailKey.createdBy?.name || "—"}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-[11px] text-muted-foreground mb-1">
                  Chave (SHA-256)
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[9px] break-all bg-muted rounded p-2 font-mono">
                    {detailKey.key}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    className="shrink-0 h-7 w-7"
                    onClick={() => handleCopyKey(detailKey.key)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Cursos</p>
                {detailKey.cursos.map((ca, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 text-sm"
                  >
                    <span>{ca.curso?.name || "Curso removido"}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {formatDuration(ca.accessDurationMinutes)}
                    </Badge>
                  </div>
                ))}
              </div>

              {detailKey.usedBy.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Usuarios que ativaram
                    </p>
                    {detailKey.usedBy.map((ub, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 text-sm"
                      >
                        <div>
                          <p className="text-xs font-medium">
                            {ub.user?.name || "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {ub.user?.email || "—"}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(ub.usedAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleDownloadPDF(detailKey)}
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDetailOpen(false)}
                >
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
