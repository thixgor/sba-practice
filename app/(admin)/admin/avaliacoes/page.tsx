"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Download,
  FileJson,
  FileUp,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
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

  // JSON Import state
  const [showImportJson, setShowImportJson] = useState(false);
  const [importJsonStep, setImportJsonStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [importJsonContent, setImportJsonContent] = useState("");
  const [importJsonPreview, setImportJsonPreview] = useState<{
    valid: boolean;
    errors: string[];
    totalAvaliacoes: number;
    preview: Array<{ name: string; tipo: string; curso: string | null; questoes: number }>;
  } | null>(null);
  const [importJsonResults, setImportJsonResults] = useState<Array<{
    name: string; tipo: string; protocolId: string; questoes: number; cursoCreated: boolean; cursoName: string | null;
  }>>([]);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());

  const fetchAvaliacoes = useCallback(() => {
    setLoading(true);
    fetch("/api/avaliacoes", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAvaliacoes(data.avaliacoes || []))
      .catch(() => toast.error("Erro ao carregar avaliações"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAvaliacoes(); }, [fetchAvaliacoes]);

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

  // ── Export ──────────────────────────────────────────────────────────
  const handleExportSelected = async () => {
    if (selectedForExport.size === 0) {
      toast.error("Selecione pelo menos uma avaliação para exportar.");
      return;
    }
    setExporting(true);
    try {
      const ids = Array.from(selectedForExport).join(",");
      const res = await fetch(`/api/avaliacoes/export?ids=${ids}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao exportar");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sba-avaliacoes-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${selectedForExport.size} avaliação(ões) exportada(s)`);
      setSelectedForExport(new Set());
    } catch {
      toast.error("Erro ao exportar avaliações");
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/avaliacoes/export?all=true", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao exportar");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sba-avaliacoes-export-ALL-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${data._totalAvaliacoes} avaliação(ões) exportada(s)`);
    } catch {
      toast.error("Erro ao exportar avaliações");
    } finally {
      setExporting(false);
    }
  };

  const toggleExportSelect = (id: string) => {
    setSelectedForExport((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Import JSON ────────────────────────────────────────────────────
  const resetImportJson = () => {
    setShowImportJson(false);
    setImportJsonStep("upload");
    setImportJsonContent("");
    setImportJsonPreview(null);
    setImportJsonResults([]);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast.error("Apenas arquivos .json são aceitos.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setImportJsonContent(content);
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleImportJsonValidate = async () => {
    if (!importJsonContent.trim()) {
      toast.error("Cole ou carregue o conteúdo JSON.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(importJsonContent);
    } catch {
      toast.error("JSON inválido. Verifique a formatação.");
      return;
    }
    try {
      const res = await fetch("/api/avaliacoes/import-json", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "validate", data: parsed }),
      });
      const data = await res.json();
      setImportJsonPreview(data);
      setImportJsonStep("preview");
    } catch {
      toast.error("Erro ao validar JSON.");
    }
  };

  const handleImportJsonExecute = async () => {
    setImportJsonStep("importing");
    try {
      const parsed = JSON.parse(importJsonContent);
      const res = await fetch("/api/avaliacoes/import-json", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "import", data: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Erro na importação");
        setImportJsonStep("preview");
        return;
      }
      setImportJsonResults(data.results || []);
      setImportJsonStep("done");
      fetchAvaliacoes();
      toast.success(data.message);
    } catch {
      toast.error("Erro ao importar.");
      setImportJsonStep("preview");
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setShowImportJson(true)}
          >
            <FileUp className="mr-1.5 h-3.5 w-3.5" />
            Importar JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={selectedForExport.size > 0 ? handleExportSelected : handleExportAll}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            {selectedForExport.size > 0 ? `Exportar (${selectedForExport.size})` : "Exportar Todas"}
          </Button>
          <Link href="/admin/avaliacoes/nova">
            <Button className="bg-sba-orange hover:bg-sba-orange/90 text-white" size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nova Avaliação
            </Button>
          </Link>
        </div>
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
                  <TableHead className="w-10 text-center">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
                      checked={filtered.length > 0 && filtered.every((a) => selectedForExport.has(a._id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedForExport(new Set(filtered.map((a) => a._id)));
                        } else {
                          setSelectedForExport(new Set());
                        }
                      }}
                      title="Selecionar todas para exportar"
                    />
                  </TableHead>
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
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      Nenhuma avaliação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((av) => (
                    <TableRow key={av._id} className={cn(selectedForExport.has(av._id) && "bg-primary/5")}>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
                          checked={selectedForExport.has(av._id)}
                          onChange={() => toggleExportSelect(av._id)}
                        />
                      </TableCell>
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

      {/* Import JSON Dialog */}
      <Dialog open={showImportJson} onOpenChange={(open) => { if (!open) resetImportJson(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              Importar Avaliações via JSON
            </DialogTitle>
            <DialogDescription>
              Importe avaliações completas (com questões e cursos) a partir de um arquivo JSON exportado.
            </DialogDescription>
          </DialogHeader>

          {/* Step: Upload */}
          {importJsonStep === "upload" && (
            <div className="space-y-4">
              <div
                className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-muted/30 p-8 transition-colors hover:border-primary/40 cursor-pointer"
                onClick={() => importFileRef.current?.click()}
              >
                <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Clique para selecionar ou arraste um arquivo .json</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formato: arquivo exportado pelo SBA Practice System
                </p>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportJsonFile}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou cole o JSON</span>
                </div>
              </div>

              <textarea
                className="w-full h-48 rounded-md border border-border/50 bg-muted/30 p-3 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder='{"avaliacoes": [{"name": "...", "tipo": "prova", "questoes": [...]}]}'
                value={importJsonContent}
                onChange={(e) => setImportJsonContent(e.target.value)}
              />

              {importJsonContent && (
                <p className="text-xs text-muted-foreground">
                  {importJsonContent.length.toLocaleString()} caracteres carregados
                </p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={resetImportJson}>Cancelar</Button>
                <Button onClick={handleImportJsonValidate} disabled={!importJsonContent.trim()}>
                  Validar e Prosseguir
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step: Preview */}
          {importJsonStep === "preview" && importJsonPreview && (
            <div className="space-y-4">
              {/* Validation status */}
              <div className={cn(
                "flex items-center gap-2 rounded-lg border p-3",
                importJsonPreview.valid
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                  : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
              )}>
                {importJsonPreview.valid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Validação OK — {importJsonPreview.totalAvaliacoes} avaliação(ões) prontas para importar
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">
                      {importJsonPreview.errors.length} erro(s) encontrado(s)
                    </span>
                  </>
                )}
              </div>

              {/* Errors */}
              {importJsonPreview.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3 max-h-40 overflow-y-auto">
                  <ul className="space-y-1">
                    {importJsonPreview.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              {importJsonPreview.preview.length > 0 && (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs">Curso</TableHead>
                        <TableHead className="text-xs text-center">Questões</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importJsonPreview.preview.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm font-medium">{p.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn("text-[10px] font-semibold", tipoColors[p.tipo] || "")}>
                              {p.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.curso || "—"}</TableCell>
                          <TableCell className="text-sm text-center">{p.questoes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setImportJsonStep("upload")}>Voltar</Button>
                <Button
                  onClick={handleImportJsonExecute}
                  disabled={!importJsonPreview.valid}
                  className="bg-sba-orange hover:bg-sba-orange/90 text-white"
                >
                  <FileJson className="mr-1.5 h-3.5 w-3.5" />
                  Importar {importJsonPreview.totalAvaliacoes} Avaliação(ões)
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step: Importing */}
          {importJsonStep === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Importando avaliações...</p>
              <p className="text-xs text-muted-foreground">Criando cursos, avaliações e questões</p>
            </div>
          )}

          {/* Step: Done */}
          {importJsonStep === "done" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-3">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Importação concluída com sucesso!
                </span>
              </div>

              {importJsonResults.length > 0 && (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs">Curso</TableHead>
                        <TableHead className="text-xs text-center">Questões</TableHead>
                        <TableHead className="text-xs">Protocolo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importJsonResults.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm font-medium">{r.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn("text-[10px] font-semibold", tipoColors[r.tipo] || "")}>
                              {r.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.cursoName || "—"}
                            {r.cursoCreated && (
                              <Badge variant="secondary" className="ml-1.5 text-[9px] bg-blue-500/10 text-blue-600">novo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-center">{r.questoes}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{r.protocolId}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <DialogFooter>
                <Button onClick={resetImportJson}>Fechar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
