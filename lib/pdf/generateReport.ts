import jsPDF from "jspdf";

interface ReportData {
  protocolId: string;
  userName: string;
  crm?: string;
  avaliacaoName: string;
  tipo: string;
  cursoName?: string;
  pontuacaoObtida: number;
  pontuacaoTotal: number;
  percentualAcerto: number;
  duracaoSegundos: number;
  dataRealizacao: Date;
  respostas: Array<{
    questaoNumero: number;
    enunciado: string;
    alternativaSelecionada?: string;
    gabarito?: string;
    correta: boolean;
    respostaComentada?: string;
    fonteBibliografica?: string;
  }>;
  gabaritoLiberado: boolean;
  logoDataUrl?: string;
}

export function generateReportPDF(data: ReportData): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const cyanColor: [number, number, number] = [1, 178, 187];
  const darkColor: [number, number, number] = [30, 41, 59];
  const grayColor: [number, number, number] = [100, 116, 139];
  const successColor: [number, number, number] = [16, 185, 129];
  const errorColor: [number, number, number] = [239, 68, 68];

  // ---------------------------------------------------------------------------
  // Helper: draw footer on a given page
  // ---------------------------------------------------------------------------
  function drawFooter() {
    const footerY = 282;
    doc.setDrawColor(...cyanColor);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setTextColor(...grayColor);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(
      "SBA - Sociedade Brasileira de Anestesiologia | R. Professor Alfredo Gomes, 36, Botafogo | (21) 3528-1050",
      pageWidth / 2,
      footerY + 4,
      { align: "center" }
    );
    doc.text(
      `Documento gerado em ${new Date().toLocaleString("pt-BR")} | Verifique em sba-practice.vercel.app/verificar/${data.protocolId}`,
      pageWidth / 2,
      footerY + 8,
      { align: "center" }
    );
  }

  // ---------------------------------------------------------------------------
  // Helper: check page break — adds new page if needed
  // ---------------------------------------------------------------------------
  function checkPage(needed: number = 20): void {
    if (y + needed > 275) {
      drawFooter();
      doc.addPage();
      y = margin;
    }
  }

  // Watermark
  doc.setTextColor(230, 230, 230);
  doc.setFontSize(50);
  doc.text("DOCUMENTO OFICIAL SBA", pageWidth / 2, 150, {
    align: "center",
    angle: 45,
  });

  // ---------------------------------------------------------------------------
  // Header with logo
  // ---------------------------------------------------------------------------
  doc.setDrawColor(...cyanColor);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Cyan header bar with logo
  const headerBarHeight = 16;
  doc.setFillColor(...cyanColor);
  doc.roundedRect(margin, y, contentWidth, headerBarHeight, 2, 2, "F");

  // SBA Logo image (white on cyan)
  if (data.logoDataUrl) {
    try {
      // Logo aspect ratio: 179x71 -> fits ~36x14mm nicely in the bar
      const logoH = headerBarHeight - 2;
      const logoW = logoH * (179 / 71);
      doc.addImage(data.logoDataUrl, "PNG", margin + 3, y + 1, logoW, logoH);
    } catch {
      // Fallback: text badge
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("SBA", margin + 10, y + 10, { align: "center" });
    }
  } else {
    // Fallback: text badge
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SBA", margin + 12, y + 10, { align: "center" });
  }

  // Title text on the bar
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("SBA Practice System", pageWidth - margin - 4, y + 7, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Sociedade Brasileira de Anestesiologia", pageWidth - margin - 4, y + 12, { align: "right" });

  y += headerBarHeight + 6;

  // Protocol ID
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, "F");
  doc.setTextColor(...cyanColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Protocolo: ${data.protocolId}`, margin + 4, y + 7.5);
  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    data.dataRealizacao.toLocaleString("pt-BR"),
    pageWidth - margin - 4,
    y + 7.5,
    { align: "right" }
  );
  y += 18;

  // User info
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Candidato(a):", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.userName, margin + 30, y);
  if (data.crm) {
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("CRM:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.crm, margin + 30, y);
  }
  y += 10;

  // Assessment info
  doc.setFont("helvetica", "bold");
  doc.text("Avaliacao:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.avaliacaoName, margin + 30, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Tipo:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.tipo, margin + 30, y);
  if (data.cursoName) {
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Curso:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.cursoName, margin + 30, y);
  }
  y += 10;

  // Score box
  const minutes = Math.floor(data.duracaoSegundos / 60);
  const seconds = data.duracaoSegundos % 60;

  doc.setDrawColor(...cyanColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 20, 3, 3, "S");

  // Score
  const scoreColor = data.percentualAcerto >= 70 ? successColor : errorColor;
  doc.setTextColor(...scoreColor);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.percentualAcerto}%`, margin + 10, y + 13);

  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${data.pontuacaoObtida} de ${data.pontuacaoTotal} questoes`,
    margin + 40,
    y + 10
  );
  doc.text(
    `Tempo: ${minutes}min ${String(seconds).padStart(2, "0")}s`,
    margin + 40,
    y + 16
  );

  const statusText = data.percentualAcerto >= 70 ? "APROVADO" : "ABAIXO DA MEDIA";
  doc.setTextColor(...scoreColor);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, pageWidth - margin - 4, y + 13, { align: "right" });
  y += 28;

  // ---------------------------------------------------------------------------
  // Answer details section
  // ---------------------------------------------------------------------------
  if (data.gabaritoLiberado && data.respostas.length > 0) {
    doc.setTextColor(...darkColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Detalhamento das Respostas", margin, y);
    y += 6;

    const isEvolutivo = data.tipo === "simulado-evolutivo";

    if (isEvolutivo) {
      // ==================================================================
      // SIMULADO EVOLUTIVO — card-based layout for long text content
      // Each question is a full-width block with wrapped text fields
      // ==================================================================
      const innerPad = 3; // internal card padding
      const textLineH = 3.2; // mm per line of body text
      const fullInnerW = contentWidth - innerPad * 2; // available text width

      for (const r of data.respostas) {
        // Pre-calculate all wrapped text
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");

        const enuncLines: string[] = doc.splitTextToSize(r.enunciado || "", fullInnerW - 12);
        const enuncDisplay = enuncLines.slice(0, 4);
        if (enuncLines.length > 4) {
          const last = enuncDisplay[3];
          enuncDisplay[3] = last.length > 3 ? last.substring(0, last.length - 3) + "..." : last + "...";
        }

        const respText = r.alternativaSelecionada || "\u2014";
        const respLines: string[] = doc.splitTextToSize(respText, fullInnerW - 24);
        const respDisplay = respLines.slice(0, 2);
        if (respLines.length > 2) {
          const last = respDisplay[1];
          respDisplay[1] = last.length > 3 ? last.substring(0, last.length - 3) + "..." : last + "...";
        }

        const gabText = r.gabarito || "\u2014";
        const gabLines: string[] = doc.splitTextToSize(gabText, fullInnerW - 24);
        const gabDisplay = gabLines.slice(0, 2);
        if (gabLines.length > 2) {
          const last = gabDisplay[1];
          gabDisplay[1] = last.length > 3 ? last.substring(0, last.length - 3) + "..." : last + "...";
        }

        // Card height: header(6) + enunciado + gap + resposta + gabarito + resultado + padding
        const cardHeight = 6
          + enuncDisplay.length * textLineH + 2
          + respDisplay.length * textLineH + 2
          + gabDisplay.length * textLineH + 2
          + 5 + innerPad * 2;

        checkPage(cardHeight + 4);

        // Card background
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y, contentWidth, cardHeight, 1.5, 1.5, "F");

        // Left accent bar with result color
        const accentColor = r.correta ? successColor : errorColor;
        doc.setFillColor(...accentColor);
        doc.roundedRect(margin, y, 2, cardHeight, 1, 1, "F");

        let cy = y + innerPad;

        // ---- Header row: Q# badge + resultado badge ----
        // Q# badge
        doc.setFillColor(...cyanColor);
        doc.roundedRect(margin + innerPad + 1, cy, 9, 5, 1, 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(`Q${r.questaoNumero}`, margin + innerPad + 5.5, cy + 3.5, { align: "center" });

        // Resultado badge (right side)
        const resultLabel = r.correta ? "CORRETO" : "INCORRETO";
        doc.setFillColor(...(r.correta ? successColor : errorColor));
        const resultBadgeW = r.correta ? 14 : 18;
        doc.roundedRect(margin + contentWidth - innerPad - resultBadgeW, cy, resultBadgeW, 5, 1, 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.text(
          resultLabel,
          margin + contentWidth - innerPad - resultBadgeW / 2,
          cy + 3.5,
          { align: "center" }
        );
        cy += 7;

        // ---- Enunciado ----
        doc.setTextColor(...darkColor);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        for (let li = 0; li < enuncDisplay.length; li++) {
          doc.text(enuncDisplay[li], margin + innerPad + 2, cy + li * textLineH);
        }
        cy += enuncDisplay.length * textLineH + 2;

        // ---- Sua Resposta ----
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...grayColor);
        doc.text("Sua Resposta:", margin + innerPad + 2, cy);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...darkColor);
        for (let li = 0; li < respDisplay.length; li++) {
          doc.text(respDisplay[li], margin + innerPad + 24, cy + li * textLineH);
        }
        cy += respDisplay.length * textLineH + 2;

        // ---- Gabarito / Valor ----
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...grayColor);
        doc.text("Gabarito:", margin + innerPad + 2, cy);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...darkColor);
        for (let li = 0; li < gabDisplay.length; li++) {
          doc.text(gabDisplay[li], margin + innerPad + 24, cy + li * textLineH);
        }

        y += cardHeight + 2;

        // ---- Resposta comentada (retroalimentação) ----
        if (r.respostaComentada) {
          const commentMaxWidth = contentWidth - 10;
          const commentLines: string[] = doc.splitTextToSize(r.respostaComentada, commentMaxWidth);
          const commentLineHeight = 3.0;
          const commentBlockHeight = commentLines.length * commentLineHeight + 6;

          checkPage(commentBlockHeight + 2);

          doc.setFillColor(240, 249, 250);
          doc.rect(margin, y, contentWidth, commentBlockHeight, "F");
          doc.setFillColor(...cyanColor);
          doc.rect(margin, y, 1.5, commentBlockHeight, "F");

          doc.setTextColor(...cyanColor);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.text("Retroalimentacao:", margin + 4, y + 3.5);

          doc.setTextColor(...grayColor);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          for (let ci = 0; ci < commentLines.length; ci++) {
            doc.text(commentLines[ci], margin + 4, y + 7 + ci * commentLineHeight);
          }

          y += commentBlockHeight + 1;
        }
      }
    } else {
      // ==================================================================
      // STANDARD EXAMS — table layout with letter-based answers
      // ==================================================================
      const colQ = margin + 2;
      const colResp = margin + 12;
      const colGab = margin + 28;
      const colResult = margin + 44;
      const colEnun = margin + 66;
      const enunMaxWidth = pageWidth - margin - colEnun - 2;

      // Table header
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 7, "F");
      doc.setFontSize(7);
      doc.setTextColor(...grayColor);
      doc.setFont("helvetica", "bold");
      doc.text("Q#", colQ, y + 5);
      doc.text("Resp.", colResp, y + 5);
      doc.text("Gab.", colGab, y + 5);
      doc.text("Resultado", colResult, y + 5);
      doc.text("Enunciado", colEnun, y + 5);
      y += 7;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");

      for (const r of data.respostas) {
        // Split enunciado into lines that fit the available width
        const enunciadoLines: string[] = doc.splitTextToSize(
          r.enunciado || "",
          enunMaxWidth
        );
        // Limit to 3 lines max with "..." on the third
        const maxLines = 3;
        const displayLines = enunciadoLines.slice(0, maxLines);
        if (enunciadoLines.length > maxLines) {
          const lastLine = displayLines[maxLines - 1];
          displayLines[maxLines - 1] =
            lastLine.length > 3
              ? lastLine.substring(0, lastLine.length - 3) + "..."
              : lastLine + "...";
        }

        const lineHeight = 3.2; // mm per line of text
        const rowHeight = Math.max(7, displayLines.length * lineHeight + 3);

        // Check page break (account for row height)
        checkPage(rowHeight + 2);

        // Q#
        doc.setTextColor(...darkColor);
        doc.text(String(r.questaoNumero), colQ, y + 4);

        // Resposta
        doc.text(r.alternativaSelecionada || "\u2014", colResp, y + 4);

        // Gabarito
        doc.text(r.gabarito || "\u2014", colGab, y + 4);

        // Resultado
        if (r.correta) {
          doc.setTextColor(...successColor);
          doc.text("Correto", colResult, y + 4);
        } else {
          doc.setTextColor(...errorColor);
          doc.text("Incorreto", colResult, y + 4);
        }

        // Enunciado — multi-line
        doc.setTextColor(...grayColor);
        for (let li = 0; li < displayLines.length; li++) {
          doc.text(displayLines[li], colEnun, y + 4 + li * lineHeight);
        }

        // Row separator
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.1);
        doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
        y += rowHeight;

        // Resposta comentada (commentary below the answer row)
        if (r.respostaComentada) {
          const commentMaxWidth = contentWidth - 10;
          const commentLines: string[] = doc.splitTextToSize(r.respostaComentada, commentMaxWidth);
          const commentLineHeight = 3.0;
          const commentBlockHeight = commentLines.length * commentLineHeight + 6;

          checkPage(commentBlockHeight + 2);

          // Commentary background
          doc.setFillColor(240, 249, 250);
          doc.rect(margin, y, contentWidth, commentBlockHeight, "F");

          // Left border accent
          doc.setFillColor(...cyanColor);
          doc.rect(margin, y, 1.5, commentBlockHeight, "F");

          // "Comentário:" label
          doc.setTextColor(...cyanColor);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.text("Comentario:", margin + 4, y + 3.5);

          // Commentary text
          doc.setTextColor(...grayColor);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          for (let ci = 0; ci < commentLines.length; ci++) {
            doc.text(commentLines[ci], margin + 4, y + 7 + ci * commentLineHeight);
          }

          // Fonte bibliografica
          if (r.fonteBibliografica) {
            const fonteY = y + 7 + commentLines.length * commentLineHeight;
            doc.setFontSize(6);
            doc.setFont("helvetica", "italic");
            doc.text(`Fonte: ${r.fonteBibliografica}`, margin + 4, fonteY);
          }

          y += commentBlockHeight;
        }
      }
    }
  }

  drawFooter();
  return doc;
}
