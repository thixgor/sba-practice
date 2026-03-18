import jsPDF from "jspdf";

// ---- Shared helpers ----

const cyanColor: [number, number, number] = [1, 178, 187];
const darkColor: [number, number, number] = [30, 41, 59];
const grayColor: [number, number, number] = [100, 116, 139];
const successColor: [number, number, number] = [16, 185, 129];
const errorColor: [number, number, number] = [239, 68, 68];
const warningColor: [number, number, number] = [245, 158, 11];

function scoreColor(score: number): [number, number, number] {
  if (score >= 70) return successColor;
  if (score >= 50) return warningColor;
  return errorColor;
}

function drawHeader(doc: jsPDF, title: string, subtitle: string, logoDataUrl?: string): number {
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Watermark
  doc.setTextColor(235, 235, 235);
  doc.setFontSize(45);
  doc.text("RELATORIO SBA", pageWidth / 2, 150, { align: "center", angle: 45 });

  // Top line
  doc.setDrawColor(...cyanColor);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Cyan header bar with logo
  const headerBarHeight = 14;
  doc.setFillColor(...cyanColor);
  doc.roundedRect(margin, y, contentWidth, headerBarHeight, 2, 2, "F");

  // Logo
  if (logoDataUrl) {
    try {
      const logoH = headerBarHeight - 2;
      const logoW = logoH * (179 / 71);
      doc.addImage(logoDataUrl, "PNG", margin + 3, y + 1, logoW, logoH);
    } catch {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("SBA", margin + 9, y + 9, { align: "center" });
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("SBA", margin + 9, y + 9, { align: "center" });
  }

  // Title on the bar
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth - margin - 4, y + 6, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, pageWidth - margin - 4, y + 11, { align: "right" });

  y += headerBarHeight + 4;

  // Date
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
  doc.setTextColor(...grayColor);
  doc.setFontSize(7);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, margin + 3, y + 5.5);
  y += 14;

  return y;
}

function drawFooter(doc: jsPDF) {
  const pageWidth = 210;
  const margin = 15;
  const footerY = 284;
  doc.setDrawColor(...cyanColor);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setTextColor(...grayColor);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    "SBA - Sociedade Brasileira de Anestesiologia | R. Professor Alfredo Gomes, 36, Botafogo | (21) 3528-1050",
    pageWidth / 2, footerY + 3.5, { align: "center" }
  );
  doc.text(
    `© ${new Date().getFullYear()} SBA Practice System — Relatório Administrativo`,
    pageWidth / 2, footerY + 7, { align: "center" }
  );
}

function checkPage(doc: jsPDF, y: number, needed: number = 20): number {
  if (y + needed > 275) {
    doc.addPage();
    drawFooter(doc);
    return 20;
  }
  return y;
}

// ---- Avaliação Report PDF ----

interface AvaliacaoReportData {
  avaliacao: {
    name: string;
    tipo: string;
    cursoName: string | null;
    totalQuestoes: number;
  };
  stats: { totalTentativas: number; avgScore: number; minScore: number; maxScore: number };
  questionStats: Array<{
    ordem: number;
    enunciado: string;
    gabarito: string;
    totalRespostas: number;
    totalCorretas: number;
    taxaAcerto: number;
  }>;
  userResults: Array<{
    userName: string;
    userEmail: string;
    pontuacaoObtida: number;
    pontuacaoTotal: number;
    percentualAcerto: number;
    duracaoSegundos: number;
    finalizadaEm: string;
  }>;
  logoDataUrl?: string;
}

export function generateAdminReportPDF(data: AvaliacaoReportData): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const margin = 15;
  const contentWidth = 210 - margin * 2;
  let y = drawHeader(doc, "Relatorio de Avaliacao", "Sociedade Brasileira de Anestesiologia", data.logoDataUrl);

  // Avaliação info
  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.avaliacao.name, margin, y);
  y += 4;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(`Tipo: ${data.avaliacao.tipo} | Questões: ${data.avaliacao.totalQuestoes}${data.avaliacao.cursoName ? ` | Curso: ${data.avaliacao.cursoName}` : ""}`, margin, y);
  y += 8;

  // Stats box
  doc.setDrawColor(...cyanColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 16, 3, 3, "S");

  const statItems = [
    { label: "Tentativas", value: String(data.stats.totalTentativas) },
    { label: "Média", value: `${data.stats.avgScore}%`, color: scoreColor(data.stats.avgScore) },
    { label: "Menor", value: `${data.stats.minScore}%`, color: errorColor },
    { label: "Maior", value: `${data.stats.maxScore}%`, color: successColor },
  ];

  const colW = contentWidth / 4;
  for (let i = 0; i < statItems.length; i++) {
    const x = margin + colW * i + colW / 2;
    doc.setTextColor(...grayColor);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(statItems[i].label, x, y + 5, { align: "center" });
    doc.setTextColor(...(statItems[i].color || darkColor));
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(statItems[i].value, x, y + 12, { align: "center" });
  }
  y += 22;

  // Question stats table
  y = checkPage(doc, y, 20);
  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Taxa de Acerto por Questão", margin, y);
  y += 5;

  // Table header
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 6, "F");
  doc.setFontSize(6);
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "bold");
  doc.text("Q#", margin + 2, y + 4);
  doc.text("Enunciado", margin + 12, y + 4);
  doc.text("Gab.", margin + 110, y + 4);
  doc.text("Acertos", margin + 125, y + 4);
  doc.text("Taxa", margin + 155, y + 4);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);

  for (const q of data.questionStats) {
    y = checkPage(doc, y, 7);
    doc.setTextColor(...darkColor);
    doc.text(String(q.ordem), margin + 2, y + 4);
    const enun = q.enunciado.length > 60 ? q.enunciado.substring(0, 60) + "..." : q.enunciado;
    doc.text(enun, margin + 12, y + 4);
    doc.text(q.gabarito || "—", margin + 110, y + 4);
    doc.text(`${q.totalCorretas}/${q.totalRespostas}`, margin + 125, y + 4);
    doc.setTextColor(...scoreColor(q.taxaAcerto));
    doc.setFont("helvetica", "bold");
    doc.text(`${q.taxaAcerto}%`, margin + 155, y + 4);
    doc.setFont("helvetica", "normal");

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.1);
    doc.line(margin, y + 5.5, 210 - margin, y + 5.5);
    y += 6;
  }
  y += 6;

  // User results table
  if (data.userResults.length > 0) {
    y = checkPage(doc, y, 20);
    doc.setTextColor(...darkColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Resultados por Usuário", margin, y);
    y += 5;

    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 6, "F");
    doc.setFontSize(6);
    doc.setTextColor(...grayColor);
    doc.setFont("helvetica", "bold");
    doc.text("Usuário", margin + 2, y + 4);
    doc.text("Nota", margin + 90, y + 4);
    doc.text("Acertos", margin + 110, y + 4);
    doc.text("Duração", margin + 135, y + 4);
    doc.text("Data", margin + 158, y + 4);
    y += 6;

    doc.setFont("helvetica", "normal");
    for (const r of data.userResults) {
      y = checkPage(doc, y, 7);
      doc.setTextColor(...darkColor);
      const uName = r.userName.length > 30 ? r.userName.substring(0, 30) + "..." : r.userName;
      doc.text(uName, margin + 2, y + 4);
      doc.setTextColor(...scoreColor(r.percentualAcerto));
      doc.setFont("helvetica", "bold");
      doc.text(`${r.percentualAcerto}%`, margin + 90, y + 4);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...darkColor);
      doc.text(`${r.pontuacaoObtida}/${r.pontuacaoTotal}`, margin + 110, y + 4);
      const m = Math.floor(r.duracaoSegundos / 60);
      const s = r.duracaoSegundos % 60;
      doc.text(`${m}m${String(Math.round(s)).padStart(2, "0")}s`, margin + 135, y + 4);
      doc.setTextColor(...grayColor);
      doc.text(new Date(r.finalizadaEm).toLocaleDateString("pt-BR"), margin + 158, y + 4);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.1);
      doc.line(margin, y + 5.5, 210 - margin, y + 5.5);
      y += 6;
    }
  }

  drawFooter(doc);
  return doc;
}

// ---- Curso Report PDF ----

interface CursoReportData {
  curso: { name: string; totalAvaliacoes: number };
  stats: { totalTentativas: number; totalUsuarios: number; avgScore: number; minScore: number; maxScore: number };
  avaliacaoSummary: Array<{
    name: string; tipo: string; totalQuestoes: number;
    totalTentativas: number; avgScore: number;
  }>;
  userStats: Array<{
    name: string; email: string; crm: string;
    tentativasTotal: number; mediaAcerto: number; avaliacoesRealizadas: number;
  }>;
  logoDataUrl?: string;
}

export function generateCursoReportPDF(data: CursoReportData): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const margin = 15;
  const contentWidth = 210 - margin * 2;
  let y = drawHeader(doc, "Relatorio de Curso", "Sociedade Brasileira de Anestesiologia", data.logoDataUrl);

  // Curso info
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.curso.name, margin, y);
  y += 4;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(`${data.curso.totalAvaliacoes} avaliações vinculadas`, margin, y);
  y += 8;

  // Stats
  doc.setDrawColor(...cyanColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 16, 3, 3, "S");

  const statItems = [
    { label: "Usuários", value: String(data.stats.totalUsuarios) },
    { label: "Tentativas", value: String(data.stats.totalTentativas) },
    { label: "Média Geral", value: `${data.stats.avgScore}%`, color: scoreColor(data.stats.avgScore) },
    { label: "Maior Nota", value: `${data.stats.maxScore}%`, color: successColor },
  ];

  const colW = contentWidth / 4;
  for (let i = 0; i < statItems.length; i++) {
    const x = margin + colW * i + colW / 2;
    doc.setTextColor(...grayColor);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(statItems[i].label, x, y + 5, { align: "center" });
    doc.setTextColor(...(statItems[i].color || darkColor));
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(statItems[i].value, x, y + 12, { align: "center" });
  }
  y += 22;

  // Avaliações summary table
  y = checkPage(doc, y, 20);
  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Avaliações do Curso", margin, y);
  y += 5;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 6, "F");
  doc.setFontSize(6);
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "bold");
  doc.text("Avaliação", margin + 2, y + 4);
  doc.text("Tipo", margin + 85, y + 4);
  doc.text("Questões", margin + 110, y + 4);
  doc.text("Tent.", margin + 135, y + 4);
  doc.text("Média", margin + 155, y + 4);
  y += 6;

  doc.setFont("helvetica", "normal");
  for (const av of data.avaliacaoSummary) {
    y = checkPage(doc, y, 7);
    doc.setTextColor(...darkColor);
    const name = av.name.length > 40 ? av.name.substring(0, 40) + "..." : av.name;
    doc.text(name, margin + 2, y + 4);
    doc.text(av.tipo, margin + 85, y + 4);
    doc.text(String(av.totalQuestoes), margin + 110, y + 4);
    doc.text(String(av.totalTentativas), margin + 135, y + 4);
    doc.setTextColor(...scoreColor(av.avgScore));
    doc.setFont("helvetica", "bold");
    doc.text(`${av.avgScore}%`, margin + 155, y + 4);
    doc.setFont("helvetica", "normal");

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.1);
    doc.line(margin, y + 5.5, 210 - margin, y + 5.5);
    y += 6;
  }
  y += 6;

  // User stats table
  if (data.userStats.length > 0) {
    y = checkPage(doc, y, 20);
    doc.setTextColor(...darkColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Desempenho por Usuário", margin, y);
    y += 5;

    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 6, "F");
    doc.setFontSize(6);
    doc.setTextColor(...grayColor);
    doc.setFont("helvetica", "bold");
    doc.text("Usuário", margin + 2, y + 4);
    doc.text("Email", margin + 55, y + 4);
    doc.text("Av. Feitas", margin + 115, y + 4);
    doc.text("Tentativas", margin + 140, y + 4);
    doc.text("Média", margin + 163, y + 4);
    y += 6;

    doc.setFont("helvetica", "normal");
    for (const u of data.userStats) {
      y = checkPage(doc, y, 7);
      doc.setTextColor(...darkColor);
      const uName = u.name.length > 25 ? u.name.substring(0, 25) + "..." : u.name;
      doc.text(uName, margin + 2, y + 4);
      doc.setTextColor(...grayColor);
      const email = u.email.length > 25 ? u.email.substring(0, 25) + "..." : u.email;
      doc.text(email, margin + 55, y + 4);
      doc.setTextColor(...darkColor);
      doc.text(String(u.avaliacoesRealizadas), margin + 115, y + 4);
      doc.text(String(u.tentativasTotal), margin + 140, y + 4);
      doc.setTextColor(...scoreColor(u.mediaAcerto));
      doc.setFont("helvetica", "bold");
      doc.text(`${u.mediaAcerto}%`, margin + 163, y + 4);
      doc.setFont("helvetica", "normal");

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.1);
      doc.line(margin, y + 5.5, 210 - margin, y + 5.5);
      y += 6;
    }
  }

  drawFooter(doc);
  return doc;
}
