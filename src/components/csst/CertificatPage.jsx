import React from "react";
import { CERTIFICATE_LOGO } from "./certificateLogo";

// ---------------------------------------------------------------------------
// Ressources générées une seule fois dans le navigateur, en images PNG (data URL),
// pour être reprises telles quelles par l'export PDF (html2canvas ne gère ni les
// filtres SVG ni mix-blend-mode).
// ---------------------------------------------------------------------------

// Fond papier (dégradés + grain d'origine) composé une seule fois en une image de la taille
// de la page : le grain reste visible, sans motif répété CSS que l'export PDF ne sait pas gérer.
let paperCache = null;
function getPaper() {
  if (paperCache !== null) return paperCache;
  try {
    const w = 1123;
    const h = 794; // A4 paysage à 96 ppp : un pixel de grain = un pixel à l'écran
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");

    const linear = ctx.createLinearGradient(0, 0, 0, h);
    linear.addColorStop(0, "#fcfaf6");
    linear.addColorStop(1, "#f6f0e6");
    ctx.fillStyle = linear;
    ctx.fillRect(0, 0, w, h);

    // Halo clair elliptique, comme le fond d'origine
    ctx.save();
    ctx.translate(w / 2, h * 0.4);
    // Même étendue que le dégradé CSS d'origine (ellipse à 70 % du coin le plus éloigné)
    const rx = (w / 2) * Math.SQRT2 * 0.7;
    const ry = h * 0.6 * Math.SQRT2 * 0.7;
    ctx.scale(1, ry / rx);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    glow.addColorStop(0, "rgba(255,255,255,0.75)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-w, -w, w * 2, w * 2);
    ctx.restore();

    // Grain d'origine : tuile de 180 px, 42 % de pixels teintés, répétée sur toute la feuille
    const size = 180;
    const tile = document.createElement("canvas");
    tile.width = size; tile.height = size;
    const tctx = tile.getContext("2d");
    const img = tctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      if (Math.random() < 0.42) {
        const dark = Math.random() < 0.55;
        img.data[i] = dark ? 92 : 170;
        img.data[i + 1] = dark ? 70 : 140;
        img.data[i + 2] = dark ? 50 : 110;
        img.data[i + 3] = Math.floor(10 + Math.random() * (dark ? 24 : 14));
      }
    }
    tctx.putImageData(img, 0, 0);
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) ctx.drawImage(tile, x, y);
    }

    paperCache = c.toDataURL("image/png");
  } catch (e) {
    paperCache = "";
  }
  return paperCache;
}

// Filet en fondu, sous forme d'image : même rendu que le dégradé d'origine,
// sans le calcul de motif qui bloquait l'export PDF.
const fadeCache = {};
function getFade(toRight) {
  const key = toRight ? "right" : "left";
  if (fadeCache[key] !== undefined) return fadeCache[key];
  try {
    const c = document.createElement("canvas");
    c.width = 300; c.height = 2;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 300, 0);
    g.addColorStop(toRight ? 0 : 1, "rgba(28,43,61,0.35)");
    g.addColorStop(toRight ? 1 : 0, "rgba(28,43,61,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 300, 2);
    fadeCache[key] = c.toDataURL("image/png");
  } catch (e) {
    fadeCache[key] = "";
  }
  return fadeCache[key];
}

// Charte d'origine du certificat : fixée ici pour ne pas dépendre du thème de l'application.
const CERT_THEME = {
  "--color-accent": "#c67139",
  "--color-accent-400": "#f6a06b",
  "--color-accent-700": "#8c491a",
  "--color-accent-800": "#643312",
  "--color-accent-2-700": "#56633f",
  "--color-neutral-700": "#645c50",
  "--font-heading": '"Caprasimo", system-ui, sans-serif',
  "--font-body": '"Figtree", system-ui, sans-serif',
};

const INK = "#1c2b3d";
const label = {
  fontSize: "10.5px",
  color: "var(--color-neutral-700)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
};

// Certificat A4 paysage (aperçu écran et export PDF).
export default function CertificatPage({ cert }) {
  const paper = getPaper();
  if (!cert) return null;

  return (
    <div
      style={{
        ...CERT_THEME,
        width: "297mm",
        height: "210mm",
        maxWidth: "100%",
        aspectRatio: "297 / 210",
        margin: "0 auto",
        backgroundColor: "#fbf8f3",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-body)",
        color: INK,
        boxShadow: "0 12px 32px rgba(46, 43, 37, 0.22)",
      }}
    >
      {/* Fond papier — image (et non background-image) : l'export PDF échoue sur les
          images de fond CSS, une image classique est rendue sans problème. */}
      {paper && (
        <img
          src={paper}
          alt=""
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
        />
      )}

      {/* Bandes haut / bas */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "9mm", background: "var(--color-accent)" }} />
      <div style={{ position: "absolute", top: "9mm", left: 0, right: 0, height: "1.2mm", background: INK }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "9mm", background: INK }} />
      <div style={{ position: "absolute", bottom: "9mm", left: 0, right: 0, height: "1.2mm", background: "var(--color-accent)" }} />

      {/* Double cadre */}
      <div style={{ position: "absolute", inset: "15mm 16mm", border: `1.2pt solid ${INK}`, borderRadius: "3px" }} />
      <div style={{ position: "absolute", inset: "17.5mm 18.5mm", border: "0.6pt solid var(--color-accent-400)", borderRadius: "2px" }} />

      {/* Coins décoratifs */}
      {[
        { top: "13.5mm", left: "14.5mm" }, { top: "13.5mm", right: "14.5mm" },
        { bottom: "13.5mm", left: "14.5mm" }, { bottom: "13.5mm", right: "14.5mm" },
      ].map((pos, i) => (
        <div key={i} style={{ position: "absolute", ...pos, width: "3mm", height: "3mm", background: "var(--color-accent)", transform: "rotate(45deg)" }} />
      ))}

      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "22mm 30mm 19mm",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        {/* Bloc principal, centré en hauteur entre le haut du cadre et le pied */}
        <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* En-tête : nom + sous-titre centrés sur l'axe de la page, logo placé à leur gauche sans les décaler */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "9mm" }}>
          <div style={{ position: "relative", textAlign: "center" }}>
            <img
              src={CERTIFICATE_LOGO}
              alt="Logo CITRAT"
              style={{ position: "absolute", right: "calc(100% + 20px)", top: "50%", transform: "translateY(-50%)", height: "70px", width: "auto", maxWidth: "124px", objectFit: "contain", display: "block" }}
            />
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "22px", color: INK, letterSpacing: "0.01em", lineHeight: 1.2 }}>
              Cabinet de Géomètre-Expert Soro Nanga
            </div>
            <div style={{ fontSize: "11.5px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-accent-700)", marginTop: "5px", textAlign: "center" }}>
              Comité Santé Sécurité au Travail
            </div>
          </div>
        </div>

        {/* Titre */}
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "48px", color: INK, lineHeight: 1.1 }}>
          Certificat de sensibilisation
        </div>
        <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--color-accent-700)", textTransform: "uppercase", letterSpacing: "0.2em", marginTop: "14px", marginBottom: "9mm" }}>
          aux risques professionnels
        </div>

        {/* Bénéficiaire */}
        <div style={{ ...label, marginBottom: "6px" }}>Décerné à</div>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "38px", color: "var(--color-accent-700)", lineHeight: 1.15 }}>
          {cert.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", marginBottom: "8mm" }}>
          <div style={{ width: "28mm", height: "1px", background: "var(--color-accent-400)" }} />
          <div style={{ width: "6px", height: "6px", background: "var(--color-accent)", transform: "rotate(45deg)" }} />
          <div style={{ width: "28mm", height: "1px", background: "var(--color-accent-400)" }} />
        </div>

        {/* Module validé */}
        <div style={{ ...label, marginBottom: "8px" }}>Pour la validation du module</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", width: "100%", marginBottom: "9mm" }}>
          <img src={getFade(false)} alt="" style={{ flex: "1 1 0", minWidth: "1px", maxWidth: "40mm", height: "1px", display: "block" }} />
          <div style={{ width: "7px", height: "7px", flex: "none", background: "var(--color-accent)", transform: "rotate(45deg)" }} />
          <div style={{ fontFamily: "var(--font-heading)", fontSize: "27px", color: "var(--color-accent-800)", lineHeight: 1.25, padding: "0 4px", maxWidth: "170mm" }}>
            {cert.moduleTitle}
          </div>
          <div style={{ width: "7px", height: "7px", flex: "none", background: "var(--color-accent)", transform: "rotate(45deg)" }} />
          <img src={getFade(true)} alt="" style={{ flex: "1 1 0", minWidth: "1px", maxWidth: "40mm", height: "1px", display: "block" }} />
        </div>

        {/* Informations */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch" }}>
          {[
            { k: "Score obtenu", v: cert.score, color: "var(--color-accent-2-700)" },
            { k: "Date", v: cert.date, color: INK },
            { k: "N° de certificat", v: cert.number, color: INK },
          ].map((item, i) => (
            <div key={item.k} style={{ padding: "0 26px", borderLeft: i ? "1px solid rgba(28,43,61,0.18)" : "none" }}>
              <div style={{ ...label, fontSize: "10px", letterSpacing: "0.1em", marginBottom: "5px" }}>{item.k}</div>
              <div style={{ fontSize: "21px", fontWeight: 700, color: item.color, whiteSpace: "nowrap" }}>{item.v}</div>
            </div>
          ))}
        </div>
        </div>

        {/* Pied : signature du Cabinet à gauche, sceau au centre, signature du CSST à droite */}
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "end", columnGap: "10mm", paddingBottom: "4mm" }}>
          <div style={{ textAlign: "center", justifySelf: "start" }}>
            <div style={{ fontSize: "9.5px", color: "var(--color-neutral-700)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "13mm" }}>
              Pour le Cabinet
            </div>
            <div style={{ width: "66mm", fontSize: "11px", fontWeight: 700, color: INK }}>
              Le Géomètre-Expert
            </div>
          </div>

          <div
            style={{
              width: "27mm",
              height: "27mm",
              borderRadius: "50%",
              border: "2px solid var(--color-accent)",
              padding: "2.5px",
              boxSizing: "border-box",
              transform: "rotate(-8deg)",
              marginBottom: "1mm",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                border: "1px dashed var(--color-accent-400)",
                background: "rgba(255,255,255,0.55)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: "7.5px", fontWeight: 700, letterSpacing: "0.18em", color: "var(--color-accent-700)" }}>CSST</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "13px", color: INK, lineHeight: 1.1, margin: "2px 0" }}>Validé</div>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--color-accent-2-700)" }}>{cert.score}</div>
            </div>
          </div>

          <div style={{ textAlign: "center", justifySelf: "end" }}>
            <div style={{ fontSize: "9.5px", color: "var(--color-neutral-700)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "13mm" }}>
              Pour le CSST
            </div>
            <div style={{ width: "66mm", fontSize: "11px", fontWeight: 700, color: INK }}>
              Le Représentant du CSST
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}