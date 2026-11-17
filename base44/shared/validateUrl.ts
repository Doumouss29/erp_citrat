import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";

/**
 * Téléchargements HTTPS uniquement. Résolution DNS contrôlée puis connexion
 * épinglée à l'IP validée, avec vérification TLS du nom original.
 * Aucune redirection automatique, aucun proxy, aucune dépendance tierce ajoutée.
 */
export function isPublicAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.some(n => n > 255)) return false;
    const [a, b, c] = parts;
    return !(a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99)))
      || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
      || (a === 203 && b === 0 && c === 113));
  }
  // URL canonicalise aussi les IPv4 mappées en IPv6. Seul l'unicast global
  // est accepté ; les plages locales, de traduction, tunnel et documentation sont refusées.
  try {
    const canonical = new URL("https://[" + ip + "]/").hostname.slice(1, -1);
    const halves = canonical.split("::");
    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves[1] ? halves[1].split(":") : [];
    const words = halves.length === 2
      ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
      : left;
    if (words.length !== 8) return false;
    const nums = words.map(x => parseInt(x, 16));
    if ((nums[0] & 0xe000) !== 0x2000) return false;
    if (nums[0] === 0x2002 || nums[0] === 0x3fff) return false;
    if (nums[0] === 0x2001 && (nums[1] < 0x200 || nums[1] === 0xdb8)) return false;
    return true;
  } catch { return false; }
}

export function validateFetchUrl(rawUrl: string): URL {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error("URL invalide"); }
  if (url.protocol !== "https:" || (url.port && url.port !== "443")) throw new Error("HTTPS sur le port 443 requis");
  if (url.username || url.password) throw new Error("Identifiants dans l'URL refusés");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host.endsWith(".") || host === "localhost" || !host.includes(".") && !host.includes(":")
      || [".localhost", ".local", ".internal", ".lan", ".home", ".test", ".invalid"].some(s => host.endsWith(s))
      || ["metadata.google.internal", "metadata.azure.com", "instance-data"].includes(host)) {
    throw new Error("Hôte interne refusé");
  }
  if ((host.includes(":") || /^\d+(\.\d+){3}$/.test(host)) && !isPublicAddress(host)) {
    throw new Error("Adresse non publique refusée");
  }
  return url;
}

export async function resolvePublicAddresses(hostname: string, resolve = dnsLookup) {
  const host = hostname.replace(/^\[|\]$/g, "");
  const addresses = await resolve(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) {
    throw new Error("Résolution DNS non publique refusée");
  }
  return addresses;
}

export async function safeFetch(rawUrl: string, init: { signal?: AbortSignal; redirect?: string } = {}) {
  const url = validateFetchUrl(rawUrl);
  const addresses = await resolvePublicAddresses(url.hostname);
  const signal = init.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(30000)])
    : AbortSignal.timeout(30000);
  return await new Promise<Response>((resolve, reject) => {
    // Le lookup injecté fournit uniquement les adresses déjà contrôlées :
    // aucun second DNS susceptible de changer entre validation et connexion.
    const req = httpsRequest(url, {
      method: "GET", agent: false, rejectUnauthorized: true,
      headers: { "accept-encoding": "identity" }, signal,
      lookup: (_hostname: string, options: any, callback: any) => {
        if (options.all) return callback(null, addresses);
        const address = addresses.find(a => !options.family || a.family === options.family);
        if (!address) return callback(new Error("Famille IP non disponible"));
        callback(null, address.address, address.family);
      },
    }, res => {
      const status = res.statusCode || 502;
      if (status >= 300 && status < 400) {
        res.destroy();
        reject(new Error("Redirection de téléchargement refusée"));
        return;
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(res.headers)) {
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
      }
      // Les serveurs doivent respecter identity ; on échoue sans parser des octets compressés.
      const encoding = headers.get("content-encoding");
      if (encoding && encoding !== "identity") {
        res.destroy(); reject(new Error("Encodage de téléchargement non pris en charge")); return;
      }
      const noBody = status === 204 || status === 205 || status === 304;
      resolve(new Response(noBody ? null : Readable.toWeb(res) as ReadableStream<Uint8Array>, { status, headers }));
      if (noBody) res.destroy();
    });
    req.on("error", reject);
    req.end();
  });
}
