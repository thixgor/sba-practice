"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Search,
  Download,
  FileDown,
  Loader2,
  Users,
  BookOpen,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Target,
} from "lucide-react";

// ---- Interfaces ----

interface Avaliacao {
  _id: string;
  name: string;
  tipo: string;
}

interface Curso {
  _id: string;
  name: string;
}

interface QuestionStat {
  questaoId: string;
  ordem: number;
  enunciado: string;
  tipo: string;
  gabarito: string;
  totalRespostas: number;
  totalCorretas: number;
  taxaAcerto: number;
  distribuicao: Record<string, number>;
}

interface UserResult {
  tentativaId: string;
  protocolId: string;
  userName: string;
  userEmail: string;
  userCrm: string;
  pontuacaoObtida: number;
  pontuacaoTotal: number;
  percentualAcerto: number;
  duracaoSegundos: number;
  finalizadaEm: string;
}

interface AvaliacaoReport {
  tipo: "avaliacao";
  avaliacao: {
    _id: string;
    name: string;
    tipo: string;
    cursoName: string | null;
    totalQuestoes: number;
  };
  stats: { totalTentativas: number; avgScore: number; minScore: number; maxScore: number };
  questionStats: QuestionStat[];
  userResults: UserResult[];
}

interface CursoReport {
  tipo: "curso";
  curso: { _id: string; name: string; totalAvaliacoes: number };
  stats: { totalTentativas: number; totalUsuarios: number; avgScore: number; minScore: number; maxScore: number };
  avaliacaoSummary: Array<{
    _id: string; name: string; tipo: string; totalQuestoes: number;
    totalTentativas: number; avgScore: number;
  }>;
  userStats: Array<{
    userId: string; name: string; email: string; crm: string;
    tentativasTotal: number; mediaAcerto: number; avaliacoesRealizadas: number;
  }>;
}

interface UserReport {
  tipo: "usuario";
  user: { _id: string; name: string; email: string; crm: string };
  stats: { totalTentativas: number; avgScore: number; minScore: number; maxScore: number };
  results: Array<{
    tentativaId: string; protocolId: string; avaliacaoName: string; avaliacaoTipo: string;
    pontuacaoObtida: number; pontuacaoTotal: number; percentualAcerto: number;
    duracaoSegundos: number; finalizadaEm: string;
  }>;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}min ${String(Math.round(s)).padStart(2, "0")}s`;
}

function scoreColor(score: number) {
  if (score >= 70) return "text-sba-success";
  if (score >= 50) return "text-sba-warning";
  return "text-sba-error";
}

// ---- Main component ----

export default function AdminRelatoriosPage() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const logoRef = useRef<string | null>(null);

  // Pre-load the SBA logo for PDF generation
  useEffect(() => {
    import("@/lib/pdf/sbaLogo").then(({ loadSBALogo }) => {
      loadSBALogo().then((url) => { logoRef.current = url; }).catch(() => {});
    });
  }, []);

  // Tab: Avaliação
  const [selectedAvaliacao, setSelectedAvaliacao] = useState("");
  const [avReport, setAvReport] = useState<AvaliacaoReport | null>(null);
  const [avLoading, setAvLoading] = useState(false);

  // Tab: Curso
  const [selectedCurso, setSelectedCurso] = useState("");
  const [cursoReport, setCursoReport] = useState<CursoReport | null>(null);
  const [cursoLoading, setCursoLoading] = useState(false);

  // Tab: Usuário
  const [searchUser, setSearchUser] = useState("");
  const [users, setUsers] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [userReport, setUserReport] = useState<UserReport | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  // PDF generation
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Load avaliacoes, cursos, users
  useEffect(() => {
    Promise.all([
      fetch("/api/avaliacoes", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/cursos", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/usuarios", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([avData, curData, usrData]) => {
        setAvaliacoes(avData.avaliacoes || []);
        setCursos(curData.cursos || []);
        setUsers(usrData.usuarios || usrData.users || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch avaliação report
  const fetchAvReport = useCallback(async (id: string) => {
    if (!id) { setAvReport(null); return; }
    setAvLoading(true);
    try {
      const res = await fetch(`/api/admin/relatorios?avaliacaoId=${id}`, { credentials: "include" });
      if (res.ok) {
        setAvReport(await res.json());
      } else {
        toast.error("Erro ao carregar relatório");
        setAvReport(null);
      }
    } catch { toast.error("Erro ao carregar relatório"); }
    finally { setAvLoading(false); }
  }, []);

  // Fetch curso report
  const fetchCursoReport = useCallback(async (id: string) => {
    if (!id) { setCursoReport(null); return; }
    setCursoLoading(true);
    try {
      const res = await fetch(`/api/admin/relatorios?cursoId=${id}`, { credentials: "include" });
      if (res.ok) {
        setCursoReport(await res.json());
      } else {
        toast.error("Erro ao carregar relatório do curso");
        setCursoReport(null);
      }
    } catch { toast.error("Erro ao carregar relatório"); }
    finally { setCursoLoading(false); }
  }, []);

  // Fetch user report
  const fetchUserReport = useCallback(async (id: string) => {
    if (!id) { setUserReport(null); return; }
    setUserLoading(true);
    try {
      const res = await fetch(`/api/admin/relatorios?userId=${id}`, { credentials: "include" });
      if (res.ok) {
        setUserReport(await res.json());
      } else {
        toast.error("Erro ao carregar relatório do usuário");
        setUserReport(null);
      }
    } catch { toast.error("Erro ao carregar relatório"); }
    finally { setUserLoading(false); }
  }, []);

  // CSV export for avaliação report
  const exportAvCSV = () => {
    if (!avReport) return;
    const header = "Usuário,Email,CRM,Nota (%),Acertos,Total,Duração,Data\n";
    const rows = avReport.userResults
      .map((r) =>
        `"${r.userName}","${r.userEmail}","${r.userCrm}",${r.percentualAcerto},${r.pontuacaoObtida},${r.pontuacaoTotal},"${formatDuration(r.duracaoSegundos)}","${new Date(r.finalizadaEm).toLocaleString("pt-BR")}"`
      )
      .join("\n");
    downloadFile(header + rows, `relatorio-${avReport.avaliacao.name.replace(/\s/g, "_")}.csv`, "text/csv");
  };

  // CSV export for curso report
  const exportCursoCSV = () => {
    if (!cursoReport) return;
    const header = "Usuário,Email,CRM,Tentativas,Média Acerto (%),Avaliações Realizadas\n";
    const rows = cursoReport.userStats
      .map((u) => `"${u.name}","${u.email}","${u.crm}",${u.tentativasTotal},${u.mediaAcerto},${u.avaliacoesRealizadas}`)
      .join("\n");
    downloadFile(header + rows, `relatorio-curso-${cursoReport.curso.name.replace(/\s/g, "_")}.csv`, "text/csv");
  };

  // PDF export for avaliação report
  const exportAvPdf = async () => {
    if (!avReport) return;
    setGeneratingPdf(true);
    try {
      const { generateAdminReportPDF } = await import("@/lib/pdf/generateAdminReport");
      const doc = generateAdminReportPDF({ ...avReport, logoDataUrl: logoRef.current || undefined });
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // PDF export for curso report
  const exportCursoPdf = async () => {
    if (!cursoReport) return;
    setGeneratingPdf(true);
    try {
      const { generateCursoReportPDF } = await import("@/lib/pdf/generateAdminReport");
      const doc = generateCursoReportPDF(cursoReport);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  function downloadFile(content: string, name: string, type: string) {
    const blob = new Blob(["\uFEFF" + content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredUsers = searchUser
    ? users.filter((u) =>
        u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchUser.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-sba-orange" />
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Análise detalhada de desempenho por avaliação, curso e usuário.
        </p>
      </motion.div>

      <Tabs defaultValue="avaliacao" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="avaliacao" className="text-xs gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Por Avaliação
          </TabsTrigger>
          <TabsTrigger value="curso" className="text-xs gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Por Curso
          </TabsTrigger>
          <TabsTrigger value="usuario" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Por Usuário
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB: POR AVALIAÇÃO ==================== */}
        <TabsContent value="avaliacao" className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-[220px] max-w-sm">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecionar Avaliação</label>
              {loading ? <Skeleton className="h-10 skeleton-sba" /> : (
                <Select value={selectedAvaliacao} onValueChange={(v) => { setSelectedAvaliacao(v); fetchAvReport(v); }}>
                  <SelectTrigger className="bg-muted/50 border-border/50">
                    <SelectValue placeholder="Selecione uma avaliação" />
                  </SelectTrigger>
                  <SelectContent>
                    {avaliacoes.map((av) => (
                      <SelectItem key={av._id} value={av._id}>
                        {av.name} <span className="text-muted-foreground ml-1">({av.tipo})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {avReport && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportAvCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportAvPdf} disabled={generatingPdf}>
                  {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                  PDF
                </Button>
              </div>
            )}
          </div>

          {avLoading && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-72 rounded-xl skeleton-sba" />
              <Skeleton className="h-72 rounded-xl skeleton-sba" />
            </div>
          )}

          {avReport && !avLoading && (
            <>
              {/* Stats cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Tentativas", value: avReport.stats.totalTentativas, icon: Users },
                  { label: "Média", value: `${avReport.stats.avgScore}%`, icon: Target, color: scoreColor(avReport.stats.avgScore) },
                  { label: "Menor Nota", value: `${avReport.stats.minScore}%`, icon: TrendingDown, color: "text-sba-error" },
                  { label: "Maior Nota", value: `${avReport.stats.maxScore}%`, icon: TrendingUp, color: "text-sba-success" },
                ].map((s) => (
                  <Card key={s.label} className="border-border/50 bg-card/80">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <s.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Bar chart */}
                <Card className="border-border/50 bg-card/80">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Taxa de Acerto por Questão</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {avReport.questionStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={avReport.questionStats.map((q) => ({ name: `Q${q.ordem}`, acerto: q.taxaAcerto }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                            formatter={(value) => [`${value}%`, "Acerto"]}
                          />
                          <Bar dataKey="acerto" fill="#01B2BB" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-12">Sem dados de questões</p>
                    )}
                  </CardContent>
                </Card>

                {/* Questions detail */}
                <Card className="border-border/50 bg-card/80">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Detalhamento por Questão</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[320px] overflow-y-auto">
                    {avReport.questionStats.length > 0 ? (
                      <div className="space-y-2">
                        {avReport.questionStats
                          .sort((a, b) => a.taxaAcerto - b.taxaAcerto)
                          .map((q) => (
                            <div key={q.questaoId} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                              <Badge variant="secondary" className="text-[10px] shrink-0">Q{q.ordem}</Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs truncate">{q.enunciado || "Sem enunciado"}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {q.totalCorretas}/{q.totalRespostas} acertos • Gabarito: {q.gabarito || "—"}
                                </p>
                              </div>
                              <span className={cn("text-sm font-bold", scoreColor(q.taxaAcerto))}>
                                {q.taxaAcerto}%
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">Sem respostas ainda</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* User results table */}
              {avReport.userResults.length > 0 && (
                <Card className="border-border/50 bg-card/80">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Resultados por Usuário</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-semibold">Usuário</TableHead>
                          <TableHead className="text-xs font-semibold">Email</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Nota</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Acertos</TableHead>
                          <TableHead className="text-xs font-semibold">Duração</TableHead>
                          <TableHead className="text-xs font-semibold">Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {avReport.userResults.map((r) => (
                          <TableRow key={r.tentativaId}>
                            <TableCell className="text-sm font-medium">{r.userName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.userEmail}</TableCell>
                            <TableCell className="text-center">
                              <span className={cn("text-sm font-bold", scoreColor(r.percentualAcerto))}>
                                {r.percentualAcerto}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-sm">{r.pontuacaoObtida}/{r.pontuacaoTotal}</TableCell>
                            <TableCell className="text-xs">{formatDuration(r.duracaoSegundos)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(r.finalizadaEm).toLocaleDateString("pt-BR")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!selectedAvaliacao && !avLoading && (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Selecione uma avaliação para visualizar os relatórios.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== TAB: POR CURSO ==================== */}
        <TabsContent value="curso" className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-[220px] max-w-sm">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecionar Curso</label>
              {loading ? <Skeleton className="h-10 skeleton-sba" /> : (
                <Select value={selectedCurso} onValueChange={(v) => { setSelectedCurso(v); fetchCursoReport(v); }}>
                  <SelectTrigger className="bg-muted/50 border-border/50">
                    <SelectValue placeholder="Selecione um curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {cursos.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {cursoReport && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCursoCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportCursoPdf} disabled={generatingPdf}>
                  {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                  PDF
                </Button>
              </div>
            )}
          </div>

          {cursoLoading && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-72 rounded-xl skeleton-sba" />
              <Skeleton className="h-72 rounded-xl skeleton-sba" />
            </div>
          )}

          {cursoReport && !cursoLoading && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: "Avaliações", value: cursoReport.curso.totalAvaliacoes },
                  { label: "Usuários", value: cursoReport.stats.totalUsuarios },
                  { label: "Tentativas", value: cursoReport.stats.totalTentativas },
                  { label: "Média Geral", value: `${cursoReport.stats.avgScore}%`, color: scoreColor(cursoReport.stats.avgScore) },
                  { label: "Maior Nota", value: `${cursoReport.stats.maxScore}%`, color: "text-sba-success" },
                ].map((s) => (
                  <Card key={s.label} className="border-border/50 bg-card/80">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={cn("text-xl font-bold mt-1", s.color)}>{s.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Avaliação summary within curso */}
              <Card className="border-border/50 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Avaliações do Curso</CardTitle>
                </CardHeader>
                <CardContent>
                  {cursoReport.avaliacaoSummary.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={cursoReport.avaliacaoSummary.map((a) => ({
                        name: a.name.length > 20 ? a.name.substring(0, 20) + "..." : a.name,
                        media: a.avgScore,
                        tentativas: a.totalTentativas,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} angle={-15} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                          formatter={(value, name) => [name === "media" ? `${value}%` : value, name === "media" ? "Média" : "Tentativas"]}
                        />
                        <Bar dataKey="media" fill="#01B2BB" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Sem avaliações</p>
                  )}
                </CardContent>
              </Card>

              {/* User stats for curso */}
              {cursoReport.userStats.length > 0 && (
                <Card className="border-border/50 bg-card/80">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Desempenho por Usuário</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-semibold">Usuário</TableHead>
                          <TableHead className="text-xs font-semibold">Email</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Av. Realizadas</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Tentativas</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Média</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cursoReport.userStats.map((u) => (
                          <TableRow key={u.userId}>
                            <TableCell className="text-sm font-medium">{u.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                            <TableCell className="text-center text-sm">{u.avaliacoesRealizadas}</TableCell>
                            <TableCell className="text-center text-sm">{u.tentativasTotal}</TableCell>
                            <TableCell className="text-center">
                              <span className={cn("text-sm font-bold", scoreColor(u.mediaAcerto))}>
                                {u.mediaAcerto}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!selectedCurso && !cursoLoading && (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Selecione um curso para visualizar o relatório geral.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== TAB: POR USUÁRIO ==================== */}
        <TabsContent value="usuario" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário por nome ou email..."
              value={searchUser}
              onChange={(e) => { setSearchUser(e.target.value); setSelectedUser(""); setUserReport(null); }}
              className="pl-9 h-10 bg-muted/50 border-border/50"
            />
          </div>

          {searchUser && filteredUsers.length > 0 && !selectedUser && (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-2 space-y-1">
                {filteredUsers.slice(0, 10).map((u) => (
                  <button
                    key={u._id}
                    onClick={() => { setSelectedUser(u._id); fetchUserReport(u._id); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {userLoading && <Skeleton className="h-64 rounded-xl skeleton-sba" />}

          {userReport && !userLoading && (
            <>
              <Card className="border-border/50 bg-card/80">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{userReport.user.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{userReport.user.email} {userReport.user.crm && `• CRM: ${userReport.user.crm}`}</p>
                    </div>
                    <div className="flex gap-3 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Tentativas</p>
                        <p className="text-lg font-bold">{userReport.stats.totalTentativas}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Média</p>
                        <p className={cn("text-lg font-bold", scoreColor(userReport.stats.avgScore))}>{userReport.stats.avgScore}%</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {userReport.results.length > 0 && (
                <Card className="border-border/50 bg-card/80">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Histórico de Avaliações</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-semibold">Avaliação</TableHead>
                          <TableHead className="text-xs font-semibold">Tipo</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Nota</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Acertos</TableHead>
                          <TableHead className="text-xs font-semibold">Duração</TableHead>
                          <TableHead className="text-xs font-semibold">Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userReport.results.map((r) => (
                          <TableRow key={r.tentativaId}>
                            <TableCell className="text-sm font-medium">{r.avaliacaoName}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">{r.avaliacaoTipo}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={cn("text-sm font-bold", scoreColor(r.percentualAcerto))}>
                                {r.percentualAcerto}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-sm">{r.pontuacaoObtida}/{r.pontuacaoTotal}</TableCell>
                            <TableCell className="text-xs">{formatDuration(r.duracaoSegundos)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(r.finalizadaEm).toLocaleDateString("pt-BR")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!searchUser && !selectedUser && (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Busque um usuário para visualizar o histórico completo.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
