import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const PAGE_BG = "#fdfcfb";

async function captureCanvas(element) {
  // Les polices du certificat doivent être chargées avant la capture
  if (document.fonts) {
    await Promise.all([
      document.fonts.load('400 48px "Caprasimo"'),
      document.fonts.load('400 14px "Figtree"'),
      document.fonts.load('700 14px "Figtree"'),
    ]).catch(() => {});
    await document.fonts.ready;
  }
  return html2canvas(element, {
    scale: 2,
    backgroundColor: PAGE_BG,
    useCORS: true,
    logging: false,
  });
}

function addCanvasToPdf(pdf, canvas) {
  const imgData = canvas.toDataURL("image/png");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
}

// Télécharge un certificat unique au format A4 paysage.
export async function downloadCertificateAsPdf(element, filename) {
  const canvas = await captureCanvas(element);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  addCanvasToPdf(pdf, canvas);
  pdf.save(filename);
}

// Télécharge plusieurs certificats dans un seul PDF multi-pages A4 paysage.
export async function downloadAllCertificatesAsPdf(elements, filename) {
  if (!elements.length) return;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  for (let i = 0; i < elements.length; i++) {
    const canvas = await captureCanvas(elements[i]);
    if (i > 0) pdf.addPage();
    addCanvasToPdf(pdf, canvas);
  }
  pdf.save(filename);
}