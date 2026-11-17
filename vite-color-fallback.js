// Remplace à la compilation les couleurs oklch(...) écrites en dur par leur équivalent hexadécimal.
// oklch n'existe pas sur Safari < 15.4, Chrome < 111 et Firefox < 113 : la couleur y est ignorée
// (textes ou fonds invisibles), et un style inline ne peut pas porter de valeur de repli.
// Le code source reste en oklch ; seul le fichier compilé change.
// « _ » : séparateur des classes Tailwind arbitraires, ex. bg-[oklch(0.82_0.15_80)].
const OKLCH = /oklch\([\s_]*([\d.]+)(%?)[\s_]+([\d.]+)[\s_]+([\d.]+|var\(--h\))(?:deg)?[\s_]*(?:\/[\s_]*([\d.]+)(%?))?[\s_]*\)/gi;
// Teinte de Coprociv : constante --h de src/styles/coprociv.css (à garder identique).
const COPROCIV_HUE = 265;
const SOURCE = /\/src\/.*\.(jsx?|tsx?|css)$/;

const gamma = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
const byte = (x) => Math.round(Math.min(1, Math.max(0, gamma(x))) * 255).toString(16).padStart(2, "0");

export function oklchToHex(l, c, h, alpha = 1) {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const hex = byte(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S)
    + byte(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S)
    + byte(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S);
  const opacity = alpha < 1 ? Math.round(alpha * 255).toString(16).padStart(2, "0") : "";
  return `#${hex}${opacity}`;
}

export default function colorFallback() {
  return {
    name: "cgesn-color-fallback",
    enforce: "pre",
    transform(code, id) {
      if (!SOURCE.test(id.split("?")[0]) || !code.includes("oklch(")) return null;
      const next = code.replace(OKLCH, (_, l, lp, c, h, a, ap) =>
        oklchToHex(lp ? l / 100 : +l, +c, h.startsWith("var") ? COPROCIV_HUE : +h, a === undefined ? 1 : ap ? a / 100 : +a));
      return next === code ? null : { code: next, map: null };
    },
  };
}
