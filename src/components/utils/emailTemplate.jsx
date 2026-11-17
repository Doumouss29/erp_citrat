/**
 * Gabarit HTML unique pour TOUS les emails envoyés par le Portail Digital CITRAT (ERP CITRAT).
 * Même identité que l'email de code de vérification : bandeau bleu #0C3D85, logo, police Poppins.
 *
 * - sendMail({ to, subject, body | html }) : point d'envoi unique.
 *   Un texte simple (body) est mis en forme automatiquement :
 *     « Bonjour X, » → salutation ; « Libellé : valeur » → tableau ; « Statut : … » → encadré ;
 *     les codes techniques (ex. mariage_enfant_frere_soeur) → libellés lisibles ;
 *     « Cordialement … » final retiré (la signature est ajoutée par le gabarit).
 */
import { base44 } from "@/api/base44Client";

export const ERP_NAME = "ERP CITRAT";
export const BRAND_NAME = "Portail Digital CITRAT";
export const ORG_NAME = "Cabinet Ivoirien des Travaux Topographiques";
export const SENDER_NAME = "PORTAIL DIGITAL CITRAT";
export const PORTAL_URL = "https://portail-digital-cgesn.com";
const GREEN = "0f5c52";
const LOGO_URL = 'https://erp-citrat.158-69-201-110.sslip.io/logo-citrat.svg';
const FONT = "'Poppins', 'Segoe UI', Arial, Helvetica, sans-serif";

/** Codes techniques → libellés (absences, périodes de congé, statuts). */
const LABELS = {
  maladie: "Maladie",
  accident_travail: "Accident du travail",
  mariage_travailleur: "Mariage du travailleur",
  mariage_enfant_frere_soeur: "Mariage enfant / frère / sœur",
  deces_conjoint: "Décès du conjoint",
  deces_enfant_pere_mere: "Décès enfant / père / mère",
  deces_frere_soeur: "Décès frère / sœur",
  deces_beau_parent: "Décès beau-parent",
  naissance_enfant: "Naissance d'un enfant",
  bapteme_enfant: "Baptême d'un enfant",
  premiere_communion: "Première communion",
  demenagement: "Déménagement",
  formation: "Formation",
  autre: "Autre",
  individuel: "Congés individuels (janv.–nov.)",
  collectif: "Congé collectif (décembre)",
  pending_level1: "En attente — Niveau 1",
  pending_level2: "En attente — Niveau 2 (RH)",
  pending_level3: "En attente — Niveau 3 (DG)",
  approved: "Approuvée",
  rejected: "Refusée",
};
export const humanize = (v) => {
  const s = String(v ?? "").trim();
  return LABELS[s] || s;
};

const C = { text: "#1f2937", muted: "#6b7280", border: "#e5e7eb", bg: "#f4f5f7", soft: "#f7f7f8" };

/** Échappement HTML : à utiliser pour TOUTE valeur injectée dans un gabarit (texte ou attribut). */
export const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Champ saisi par un utilisateur : ramené sur une seule ligne, pour qu'il ne puisse pas simuler
 *  une ligne du gabarit (faux statut, faux solde) dans les e-mails du circuit RH. */
export const oneLine = (v) => String(v ?? "").replace(/\s*\n+\s*/g, " ").trim();

const cleanHex = (hex, fallback = GREEN) => {
  const h = String(hex || "").replace("#", "").trim();
  return /^[0-9a-fA-F]{6}$/.test(h) ? h : fallback;
};

function normalizeSignature(signature) {
  return /direction/i.test(String(signature || "")) ? "La Direction" : "Service des Ressources Humaines";
}

/* ---------- Blocs ---------- */

export function emailDetails(rows) {
  const valid = (rows || []).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "");
  if (!valid.length) return "";
  const trs = valid
    .map(([label, value], i) => `
      <tr>
        <td style="padding:10px 14px;width:38%;font-size:13px;font-weight:600;color:${C.muted};background:${C.soft};${i ? `border-top:1px solid ${C.border};` : ""}">${escapeHtml(label)}</td>
        <td style="padding:10px 14px;font-size:14px;color:#111827;${i ? `border-top:1px solid ${C.border};` : ""}">${escapeHtml(humanize(value))}</td>
      </tr>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid ${C.border};border-radius:10px;margin:16px 0;">${trs}</table>`;
}

export function emailNotice(html, color = GREEN) {
  const c = cleanHex(color);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr>
    <td bgcolor="${C.soft}" style="background:${C.soft};border-left:4px solid #${c};padding:12px 16px;font-size:14px;line-height:1.6;color:${C.text};border-radius:0 8px 8px 0;">${html}</td>
  </tr></table>`;
}

export function emailButton(label, url = PORTAL_URL) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;"><tr>
    <td bgcolor="#${GREEN}" style="background:#${GREEN};border-radius:8px;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:${FONT};">${escapeHtml(label)}</a>
    </td>
  </tr></table>`;
}

/* ---------- Mise en forme automatique d'un texte simple ---------- */

const LABEL_LINE = /^\s*([A-Za-zÀ-ÿ'’()\s.\-]{2,32}?)\s*:\s*(.+)$/;

export function formatBody(text, { accentColor = GREEN } = {}) {
  let t = String(text || "").replace(/\r/g, "").trim();
  let greeting = null;

  const g = t.match(/^((?:Bonjour|Bonsoir|Cher\(e\)|Chère|Cher|Madame|Monsieur)[^,\n]{0,80}),\s*/i);
  if (g) {
    greeting = g[1].trim() + ",";
    t = t.slice(g[0].length);
    t = t.charAt(0).toUpperCase() + t.slice(1);
  }
  t = t.replace(/\n*\s*Cordialement,?[\s\S]*$/i, "").trim();

  const blocks = [];
  let para = [];
  let rows = [];
  const flushPara = () => { if (para.length) blocks.push(`<p style="margin:0 0 12px;">${para.map(escapeHtml).join("<br>")}</p>`); para = []; };
  const flushRows = () => { if (rows.length) blocks.push(emailDetails(rows)); rows = []; };

  for (const raw of t.split("\n")) {
    const line = raw.trim();
    if (!line) { flushPara(); flushRows(); continue; }
    // Titre de section du type « Détails de votre demande: » → on le garde comme intertitre discret
    if (/^[^:]{3,40}:\s*$/.test(line)) {
      flushPara(); flushRows();
      blocks.push(`<p style="margin:16px 0 0;font-size:13px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(line.replace(/:\s*$/, ""))}</p>`);
      continue;
    }
    const m = line.match(LABEL_LINE);
    if (m && /^statut$/i.test(m[1].trim())) {
      flushPara(); flushRows();
      blocks.push(emailNotice(`<strong>Statut :</strong> ${escapeHtml(humanize(m[2]))}`, accentColor));
    } else if (m && !/https?$/i.test(m[1].trim())) {
      flushPara();
      rows.push([m[1].trim(), m[2].trim()]);
    } else {
      flushRows();
      para.push(line);
    }
  }
  flushPara(); flushRows();
  return { greeting, html: blocks.join("\n") };
}

/* ---------- Gabarit ---------- */

export function buildEmailHtml({
  preheader = "",
  greeting,
  content = "",
  title,
  signature,
  cta,
  accentColor = GREEN,
  footerNote,
}) {
  // Le contenu est TOUJOURS traité comme du texte, donc échappé : le HTML riche n'est jamais
  // déduit du contenu, il doit être fourni explicitement par l'application (paramètre `html` de sendMail).
  let bodyHtml = "";
  let greet = greeting;
  if (typeof content === "string") {
    const f = formatBody(content.replace(/^\s*<p>([\s\S]*)<\/p>\s*$/i, "$1"), { accentColor });
    bodyHtml = f.html;
    if (f.greeting) greet = f.greeting;
  }
  const headerTitle = escapeHtml(title || preheader || BRAND_NAME);
  const sign = normalizeSignature(signature);
  const footer = footerNote || `Message automatique du ${BRAND_NAME} — merci de ne pas répondre à cet e-mail.`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${headerTitle}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT};color:${C.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="width:100%;max-width:560px;background:#ffffff;border:1px solid ${C.border};border-radius:12px;">

    <tr><td bgcolor="#${GREEN}" style="background:#${GREEN};padding:22px 24px;border-radius:12px 12px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="44" height="44" valign="middle" bgcolor="#ffffff" style="width:44px;height:44px;background:#ffffff;border-radius:8px;overflow:hidden;"><img src="${LOGO_URL}" alt="" width="44" height="44" style="display:block;width:44px;height:44px;border-radius:8px;border:0;outline:none;text-decoration:none;font-size:0;line-height:0;color:#ffffff;"></td>
        <td valign="middle" style="padding-left:14px;">
          <div style="font-size:20px;font-weight:600;color:#ffffff;line-height:1.2;">${ERP_NAME}</div>
          <div style="font-size:11px;font-weight:700;color:#d1fae5;letter-spacing:1.2px;text-transform:uppercase;margin-top:3px;">${BRAND_NAME}</div>
        </td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:26px 28px 0;">
      <div style="font-size:18px;font-weight:700;color:#111827;line-height:1.35;">${headerTitle}</div>
    </td></tr>

    <tr><td style="padding:14px 28px 8px;font-size:15px;line-height:1.65;color:#374151;">
      ${greet ? `<p style="margin:0 0 12px;">${escapeHtml(greet)}</p>` : ""}
      ${bodyHtml}
      ${cta ? emailButton(cta.label, cta.url || PORTAL_URL) : ""}
    </td></tr>

    <tr><td style="padding:12px 28px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="border-top:1px solid ${C.border};padding-top:16px;font-size:14px;color:${C.muted};">
          Cordialement,<br>
          <strong style="color:#${GREEN};">${sign}</strong><br>
          <span style="font-size:13px;">${ORG_NAME}</span>
        </td>
      </tr></table>
    </td></tr>

    <tr><td bgcolor="${C.soft}" style="background:${C.soft};padding:16px 28px;border-top:1px solid ${C.border};border-radius:0 0 12px 12px;">
      <p style="margin:0;font-size:11px;line-height:1.6;color:#9ca3af;text-align:center;">${footer}</p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** Bouton « valider » ajouté automatiquement quand le mail attend une action. */
function autoCta(subject, body) {
  const txt = `${subject || ""} ${body || ""}`;
  if (/(à valider|attend votre validation|veuillez valider)/i.test(txt) && !/(approuv|refus)/i.test(subject || "")) {
    return { label: "Ouvrir le portail pour valider", url: PORTAL_URL };
  }
  return undefined;
}

/**
 * Point d'envoi UNIQUE. Accepte { to, subject, html } ou { to, subject, body }.
 */
export async function sendMail({ to, subject, html, body, ...rest }) {
  let finalHtml = html;
  // `body` = texte (saisie utilisateur ou gabarit texte) : toujours mis en forme ET échappé.
  // Le HTML riche (ex. avis DG du tableau de bord) passe uniquement par `html`, construit par l'application.
  if (!finalHtml && body) {
    finalHtml = buildEmailHtml({ preheader: subject, title: subject, content: body, cta: autoCta(subject, body) });
  }
  if (finalHtml && !/<html/i.test(finalHtml) && !/<(div|table)\b/i.test(finalHtml)) {
    finalHtml = buildEmailHtml({ preheader: subject, title: subject, content: finalHtml });
  }
  // Le service attend le contenu dans `body` (même fonctionnement que CITRAT-Board), sous forme de bloc HTML
  // sans enveloppe de document complet.
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(finalHtml || "");
  return base44.integrations.Core.SendEmail({
    from_name: SENDER_NAME,
    ...rest,
    to,
    subject,
    body: bodyMatch ? bodyMatch[1].trim() : finalHtml,
  });
}