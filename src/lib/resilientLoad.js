import { base44 } from "@/api/base44Client";

// Extrait le code HTTP, le message et le corps de réponse d'une erreur SDK.
export const describeError = (error) => {
  const status = error?.status ?? error?.response?.status ?? 0;
  let details = "";
  try {
    const data = error?.data ?? error?.response?.data;
    details = data ? (typeof data === "string" ? data : JSON.stringify(data)) : (error?.stack || "");
  } catch (_) {}
  return { status: Number(status) || 0, message: String(error?.message || error), details: details.slice(0, 2000) };
};

// Enregistre l'erreur dans ClientErrorLog (lisible par les admins) sans jamais bloquer la page.
export const logClientError = async (page, request, attempt, error, durationMs) => {
  const info = describeError(error);
  console.error(`[${page}] ${request} a échoué (tentative ${attempt})`, info, error);
  try {
    await base44.entities.ClientErrorLog.create({
      page,
      request,
      attempt,
      status: info.status,
      message: info.message,
      details: info.details,
      duration_ms: Math.round(durationMs),
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : "",
    });
  } catch (_) { /* un log ne doit jamais casser l'affichage */ }
  return info;
};

// Exécute une requête, la relance une fois en cas d'échec, et renvoie
// { ok: true, data } ou { ok: false, data: [], request, status, message, details }.
export const loadWithRetry = async (page, request, fn) => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = performance.now();
    try {
      return { ok: true, data: (await fn()) || [] };
    } catch (error) {
      const info = await logClientError(page, request, attempt, error, performance.now() - started);
      if (attempt === 2) return { ok: false, data: [], request, ...info };
      await new Promise((r) => setTimeout(r, info.status === 429 ? 2000 : 800));
    }
  }
};
