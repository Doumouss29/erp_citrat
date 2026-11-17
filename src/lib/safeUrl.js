/**
 * Renvoie l'URL uniquement si elle est en http(s) ; sinon `undefined`.
 *
 * Les URL de pièces jointes (justificatifs, documents, tickets…) sont stockées
 * dans des entités que l'utilisateur peut parfois remplir via l'API. Un lien
 * `javascript:` ou `data:` placé dans un href ou un window.open deviendrait un
 * XSS stocké chez la personne qui clique (souvent un validateur ou un admin).
 *
 *   <a href={safeUrl(doc.url_fichier)}>…</a>
 *   openSafeUrl(doc.url)
 */
export function safeUrl(value) {
  if (!value || typeof value !== "string") return undefined;
  try {
    const url = new URL(value.trim(), window.location.origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function openSafeUrl(value) {
  const url = safeUrl(value);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}
