// Helper natif de dessin de tableaux PDF (remplace jspdf-autotable).
// Utilisé par exportCollectePdf et exportRapportHebdomadairePdf.
export function drawSimpleTable(doc, options) {
  const {
    startY,
    head = [],
    body = [],
    styles = {},
    headStyles = {},
    margin = { left: 14, right: 14 },
  } = options;

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = margin.left ?? 14;
  const marginRight = margin.right ?? 14;
  const tableWidth = pageWidth - marginLeft - marginRight;
  const fontSize = styles.fontSize ?? 10;
  const cellPadding = styles.cellPadding ?? 3;
  const minCellHeight = styles.minCellHeight ?? 10;

  const numCols = head.length || (body[0] ? body[0].length : 1);
  const colWidth = tableWidth / numCols;

  doc.setFontSize(fontSize);

  let y = startY;

  // Header row
  if (head.length > 0) {
    const headHeight = minCellHeight;
    const fillColor = headStyles.fillColor || [41, 128, 185];
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    doc.rect(marginLeft, y, tableWidth, headHeight, "F");

    const textColor = headStyles.textColor ?? 255;
    doc.setTextColor(textColor, textColor, textColor);
    doc.setFont(undefined, "bold");

    const headAlign = headStyles.halign || "left";
    head.forEach((text, i) => {
      const cellX = marginLeft + i * colWidth;
      const label = String(text ?? "");
      const textWidth = doc.getTextWidth(label);
      let x = cellX + cellPadding;
      if (headAlign === "center") x = cellX + (colWidth - textWidth) / 2;
      else if (headAlign === "right") x = cellX + colWidth - textWidth - cellPadding;
      doc.text(label, x, y + headHeight / 2 + fontSize / 3, {
        maxWidth: colWidth - cellPadding * 2,
      });
    });

    y += headHeight;
  }

  // Body rows
  doc.setFont(undefined, "normal");
  doc.setTextColor(15, 23, 42);

  const rowAlign = styles.halign || "left";
  body.forEach((row, rowIdx) => {
    const rowHeight = minCellHeight;

    if (rowIdx % 2 === 1) {
      doc.setFillColor(245, 245, 245);
      doc.rect(marginLeft, y, tableWidth, rowHeight, "F");
    }

    (row || []).forEach((text, i) => {
      const cellX = marginLeft + i * colWidth;
      const label = String(text ?? "");
      const textWidth = doc.getTextWidth(label);
      let x = cellX + cellPadding;
      if (rowAlign === "center") x = cellX + (colWidth - textWidth) / 2;
      else if (rowAlign === "right") x = cellX + colWidth - textWidth - cellPadding;
      doc.text(label, x, y + rowHeight / 2 + fontSize / 3, {
        maxWidth: colWidth - cellPadding * 2,
      });
    });

    y += rowHeight;
  });

  // Borders
  doc.setDrawColor(200, 200, 200);
  const totalRows = body.length + (head.length > 0 ? 1 : 0);
  const totalHeight = totalRows * minCellHeight;

  for (let i = 0; i <= totalRows; i++) {
    const lineY = startY + i * minCellHeight;
    doc.line(marginLeft, lineY, marginLeft + tableWidth, lineY);
  }
  for (let i = 0; i <= numCols; i++) {
    const lineX = marginLeft + i * colWidth;
    doc.line(lineX, startY, lineX, startY + totalHeight);
  }

  // Mimic jspdf-autotable's finalY so callers can use doc.lastAutoTable.finalY
  doc.lastAutoTable = { finalY: y };
  return y;
}