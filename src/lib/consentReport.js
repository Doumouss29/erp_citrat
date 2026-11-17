// Rapport de consentement individuel (PDF A4) généré dans le navigateur avec jsPDF.
// Contenu : identité du collaborateur, état de son consentement, notice acceptée, attestation.
import { jsPDF } from "jspdf";
import { CONSENT_VERSION, CONSENT_UPDATED, NOTICE, LEGAL_FRAMEWORK, ageFromDate } from "@/lib/consentement";

const GREEN = [15, 92, 82];
const GREEN_DARK = [13, 59, 63];
const GOLD = [217, 165, 74];
const INK = [34, 40, 38];
const MUTED = [110, 118, 115];
const LINE = [222, 228, 226];
const TILE = [246, 248, 247];

const STATUS_COLORS = {
  ok: { bg: [227, 239, 236], fg: [10, 64, 56] },
  pending: { bg: [253, 243, 226], fg: [138, 75, 8] },
  outdated: { bg: [253, 243, 226], fg: [138, 75, 8] },
  refused: { bg: [253, 236, 234], fg: [122, 31, 22] },
  withdrawn: { bg: [253, 236, 234], fg: [122, 31, 22] },
  exempt: { bg: [238, 240, 242], fg: [75, 85, 82] },
};

// Heure d'Abidjan (GMT). Les dates Base44 sans fuseau (ex. created_date) sont en UTC : on ajoute "Z".
const TZ = "Africa/Abidjan";
const toDate = (d) => new Date(typeof d === "string" && /T\d{2}:\d{2}/.test(d) && !/(Z|[+-]\d{2}:?\d{2})$/.test(d) ? d + "Z" : d);
const fmt = (d) => (d ? toDate(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: TZ }) : "—");
const fmtDay = (d) => (d ? toDate(d).toLocaleDateString("fr-FR", { timeZone: TZ }) : "—");

// Nom de fichier sûr : « rapport-consentement-KONE-Lacina.pdf »
export function reportFileName(u) {
  const parts = [u.last_name, u.first_name].filter(Boolean);
  const base = (parts.length ? parts.join(" ") : u.full_name || (u.email || "utilisateur").split("@")[0]);
  const safe = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `rapport-consentement-${safe || "utilisateur"}.pdf`;
}

async function loadImage(url) {
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
    const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = dataUrl; });
    if (!img) return null;
    // Conversion en PNG (garde la transparence, quel que soit le format d'origine)
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };
  } catch (e) {
    return null;
  }
}

/**
 * @param {object} p
 * @param {{u, status, lastDecision}} p.row  le collaborateur et l'état de son consentement
 * @param {object} p.statusLabels
 * @param {object} p.decisionLabels
 * @param {string} [p.logoUrl]
 * @param {"save"|"blob"} [p.output]  "save" télécharge le fichier ; "blob" le renvoie (envoi par e-mail)
 */
export async function buildConsentReport({ row, statusLabels, decisionLabels, logoUrl, output = "save" }) {
  const { u, status, lastDecision } = row;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15;
  const CW = W - 2 * M;
  const now = new Date();
  const logo = await loadImage(logoUrl);
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.full_name || u.email || "—";
  let y = 0;

  const text = (s, x, yy, o = {}) => {
    doc.setFont("helvetica", o.bold ? "bold" : "normal");
    doc.setFontSize(o.size || 9);
    doc.setTextColor(...(o.color || INK));
    doc.text(String(s ?? ""), x, yy, { align: o.align || "left", maxWidth: o.maxWidth });
  };
  const ensure = (h) => {
    if (y + h <= H - 18) return;
    doc.addPage();
    doc.setFillColor(...GREEN_DARK);
    doc.rect(0, 0, W, 12, "F");
    text(`Rapport de consentement — ${fullName}`, M, 7.8, { bold: true, size: 9, color: [255, 255, 255] });
    y = 22;
  };
  const section = (title) => {
    ensure(16);
    y += 4;
    doc.setFillColor(...GOLD);
    doc.rect(M, y - 3.6, 1.4, 4.6, "F");
    text(title.toUpperCase(), M + 4, y, { bold: true, size: 10, color: GREEN });
    y += 7;
  };

  // ---------- Bandeau ----------
  doc.setFillColor(...GREEN_DARK);
  doc.rect(0, 0, W, 44, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 44, W, 1.2, "F");
  let tx = M;
  if (logo) {
    // Logo détouré posé directement sur le bandeau vert (pas de cadre blanc).
    const r = Math.min(32 / logo.w, 30 / logo.h);
    const lw = logo.w * r, lh = logo.h * r;
    try { doc.addImage(logo.dataUrl, "PNG", M, 22 - lh / 2, lw, lh); } catch (e) { /* format non pris en charge */ }
    tx = M + lw + 7;
  }
  text("RAPPORT DE CONSENTEMENT", tx, 19, { bold: true, size: 17, color: [255, 255, 255] });
  text("Données personnelles du collaborateur", tx, 26, { size: 10.5, color: [220, 232, 229] });
  text("Cabinet de Géomètre Expert Soro Nanga (CGESN) — Portail Digital", tx, 32.5, { size: 8.5, color: [190, 210, 206] });

  y = 54;
  [
    ["Date du rapport", now.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: TZ })],
    ["Délivré par", "Cabinet de Géomètre Expert Soro Nanga (CGESN)"],
    ["Notice en vigueur", `Version ${CONSENT_VERSION} — mise à jour le ${CONSENT_UPDATED}`],
    ["Cadre légal", LEGAL_FRAMEWORK],
  ].forEach(([k, v]) => {
    text(k, M, y, { size: 9, color: MUTED });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(v, CW - 38);
    doc.text(lines, M + 38, y);
    y += 5.5 + (lines.length - 1) * 4;
  });

  // ---------- Collaborateur ----------
  section("Collaborateur");
  const age = ageFromDate(u.date_naissance);
  const idRows = [
    ["Nom", u.last_name || "—"],
    ["Prénom", u.first_name || "—"],
    ["Adresse e-mail", u.email || "—"],
    ["Téléphone", u.telephone || "—"],
    ["Date de naissance", u.date_naissance ? `${fmtDay(u.date_naissance)}${age != null ? ` (${age} ans)` : ""}` : "—"],
  ];
  const boxH = idRows.length * 6.5 + 5;
  doc.setFillColor(...TILE);
  doc.roundedRect(M, y - 1, CW, boxH, 2.5, 2.5, "F");
  let iy = y + 4.5;
  idRows.forEach(([k, v]) => {
    text(k, M + 5, iy, { size: 9, color: MUTED });
    text(v, M + 50, iy, { size: 9.5, bold: true });
    iy += 6.5;
  });
  y += boxH + 4;

  // ---------- Consentement ----------
  section("État du consentement");
  const col = STATUS_COLORS[status] || STATUS_COLORS.exempt;
  const label = statusLabels[status] || status;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const bw = doc.getTextWidth(label) + 10;
  doc.setFillColor(...col.bg);
  doc.roundedRect(M, y - 1, bw, 8, 4, 4, "F");
  doc.setTextColor(...col.fg);
  doc.text(label, M + 5, y + 4.4);
  y += 13;
  [
    ["Date de l'accord", status === "ok" ? fmt(u.consentement_date) : "—"],
    ["Version acceptée", u.consentement_version ? `v${u.consentement_version}` : "—"],
    ["Dernière décision", lastDecision ? `${decisionLabels[lastDecision.decision] || lastDecision.decision} le ${fmt(lastDecision.created_date)}` : "—"],
  ].forEach(([k, v]) => {
    text(k, M, y, { size: 9, color: MUTED });
    text(v, M + 45, y, { size: 9.5, bold: true });
    y += 6;
  });
  y += 2;

  // ---------- Notice ----------
  section(`Notice d'information (v${CONSENT_VERSION})`);
  NOTICE.forEach((n) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(n.texte, CW - 46);
    ensure(lines.length * 4.3 + 3);
    text(n.titre, M, y, { size: 9, bold: true, color: GREEN });
    doc.setTextColor(...INK);
    doc.text(lines, M + 46, y);
    y += lines.length * 4.3 + 3;
  });

  // ---------- Attestation ----------
  section("Attestation");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  const att = doc.splitTextToSize(
    `Le présent rapport est extrait du journal horodaté des consentements du Portail Digital CGESN. Il reflète l'état du consentement de ${fullName} à la date du rapport. Chaque accord, mise à jour, refus ou retrait est enregistré au moment de la décision et n'est pas modifiable par les utilisateurs.`,
    CW
  );
  ensure(att.length * 4.3);
  doc.text(att, M, y);

  // ---------- Pieds de page ----------
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M, H - 12, W - M, H - 12);
    text("Document confidentiel — CGESN", M, H - 7.5, { size: 7.5, color: MUTED });
    text(`Page ${p} / ${total}`, W - M, H - 7.5, { size: 7.5, color: MUTED, align: "right" });
  }

  if (output === "blob") return { blob: doc.output("blob"), fileName: reportFileName(u) };
  doc.save(reportFileName(u));
  return null;
}
