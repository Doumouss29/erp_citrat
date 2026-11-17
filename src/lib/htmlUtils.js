/**
 * Utilitaires d'échappement et d'assainissement HTML pour éviter les XSS stockées.
 */

/**
 * Échappe une valeur pour insertion sûre dans du HTML (texte brut).
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Assainit du HTML riche (ex: issu d'un éditeur rich text) pour rendu via
 * dangerouslySetInnerHTML. Convertit le HTML en texte brut échappé avec
 * sauts de ligne préservés (balises block → \n), ce qui élimine tout
 * vecteur XSS (script, mXSS, mutation DOM, etc.).
 */
export function sanitizeRichHtml(html) {
  if (!html) return "";
  let out = String(html);
  // Convertir les balises block en sauts de ligne
  out = out.replace(/<\s*\/\s*(p|div|li|h[1-6]|tr|ul|ol)\s*>/gi, "\n");
  out = out.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  // Supprimer toutes les balises HTML restantes (ouvrantes et fermantes)
  out = out.replace(/<[^>]+>/g, "");
  // Décoder les entités HTML courantes avant ré-échappement
  out = out.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // Échapper le texte brut
  out = out
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  // Convertir les sauts de ligne en <br> pour le rendu HTML
  out = out.replace(/\n/g, "<br>");
  return out;
}

/**
 * Valide qu'une chaîne est un email au format correct.
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}