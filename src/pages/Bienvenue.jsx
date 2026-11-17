import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Apple, Smartphone, Monitor, X, Share, Download } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { useBrandLogos } from "@/lib/brandLogos";

export default function Bienvenue() {
  const navigate = useNavigate();
  const logos = useBrandLogos();
  const { hasPrompt, install, isInstalled } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  const [modal, setModal] = useState(null); // null | "android" | "ios" | "desktop"

  // Redirection auto si déjà installé
  useEffect(() => {
    if (isInstalled) navigate("/connexion", { replace: true });
  }, [isInstalled, navigate]);

  const handleAndroid = async () => {
    // On tente toujours l'invite native d'abord (Android/Chrome).
    // Si elle n'est pas disponible (déjà utilisée, navigateur non supporté,
    // ou aperçu desktop), on affiche les instructions manuelles.
    if (hasPrompt) {
      setInstalling(true);
      const accepted = await install();
      setInstalling(false);
      if (accepted) navigate("/connexion", { replace: true });
    } else {
      setModal("android");
    }
  };

  const handleIOS = () => setModal("ios");

  const handleDesktop = async () => {
    // Sur ordinateur, on déclenche directement l'invite native du navigateur
    // (Chrome, Edge). Si le navigateur ne supporte pas l'installation PWA,
    // on redirige simplement vers la connexion.
    if (hasPrompt) {
      setInstalling(true);
      await install();
      setInstalling(false);
    }
    navigate("/connexion", { replace: true });
  };

  return (
    <>
      <style>{`
        .cgesn-install-btn:hover{background:#08245f !important}
        @media (max-width:480px){
          .cgesn-install-logo{width:185px !important;height:70px !important}
          .cgesn-install-title{font-size:16px !important}
          .cgesn-install-sub{font-size:10px !important}
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(120deg,#0d3b3f 0%,#0A347B 55%,#0d3b3f 100%)",
          padding: 24,
          fontFamily: "'Poppins',Helvetica,Arial,sans-serif"
        }}
      >
        <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", padding: "clamp(32px,5vw,48px)", width: "100%", maxWidth: 400, boxSizing: "border-box" }}>
          {/* En-tête identique à Connexion */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={logos.login} alt="CITRAT" className="cgesn-install-logo" style={{ width: 200, height: 74, objectFit: "contain", display: "block" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="cgesn-install-title" style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.01em" }}>
                <span style={{ color: "#00A4D6" }}>PORTAIL DIGITAL</span>{" "}
                <span style={{ color: "#091F68" }}>CITRAT</span>
              </div>
              <div className="cgesn-install-sub" style={{ fontSize: 11, fontWeight: 500, color: "oklch(0.55 0.005 90)", letterSpacing: "0.02em", marginTop: 4 }}>
                DAGNOKO HAMED
              </div>
            </div>
          </div>

          {/* Deux boutons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={handleAndroid}
              disabled={installing}
              className="cgesn-install-btn"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: 13, border: "none", borderRadius: 10,
                background: "#0A347B", color: "#fff", fontSize: 14, fontWeight: 700,
                letterSpacing: "0.02em", cursor: installing ? "wait" : "pointer",
                fontFamily: "'Poppins',sans-serif", transition: "background .15s",
                opacity: installing ? 0.8 : 1
              }}
            >
              <Smartphone size={18} />
              {installing ? "INSTALLATION…" : "Installer sur Android"}
            </button>

            <button
              onClick={handleIOS}
              className="cgesn-install-btn"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: 13, border: "none", borderRadius: 10,
                background: "#0A347B", color: "#fff", fontSize: 14, fontWeight: 700,
                letterSpacing: "0.02em", cursor: "pointer",
                fontFamily: "'Poppins',sans-serif", transition: "background .15s"
              }}
            >
              <Apple size={18} />
              Installer sur iPhone
            </button>

            <button
              onClick={handleDesktop}
              disabled={installing}
              className="cgesn-install-btn"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: 13, border: "none", borderRadius: 10,
                background: "#0A347B", color: "#fff", fontSize: 14, fontWeight: 700,
                letterSpacing: "0.02em", cursor: installing ? "wait" : "pointer",
                fontFamily: "'Poppins',sans-serif", transition: "background .15s",
                opacity: installing ? 0.8 : 1
              }}
            >
              <Monitor size={18} />
              {installing ? "INSTALLATION…" : "Installer sur ordinateur"}
            </button>
          </div>

        </div>
      </div>

      {modal && <InstallModal platform={modal} onClose={() => setModal(null)} />}
    </>
  );
}

function InstallModal({ platform, onClose }) {
  const isIOS = platform === "ios";
  const isDesktop = platform === "desktop";
  const title = isIOS ? "Installer sur iPhone" : isDesktop ? "Installer sur ordinateur" : "Installer sur Android";
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, maxWidth: 360, width: "100%", padding: 28, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", fontFamily: "'Poppins',sans-serif" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#0A347B", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Download size={18} color="#fff" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0a4d46" }}>
              {title}
            </span>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, color: "#737373" }} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        {isIOS ? (
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: "#4a5568" }}>
            <li style={{ marginBottom: 8 }}>
              Appuyez sur le bouton <strong>Partager</strong>{" "}
              <Share size={15} style={{ display: "inline", verticalAlign: "middle", color: "#0A347B" }} />
              {" "}en bas de l'écran dans Safari.
            </li>
            <li style={{ marginBottom: 8 }}>
              Faites défiler et choisissez <strong>« Sur l'écran d'accueil »</strong>.
            </li>
            <li>
              Confirmez avec <strong>« Ajouter »</strong>. L'icône apparaît sur votre écran d'accueil.
            </li>
          </ol>
        ) : isDesktop ? (
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: "#4a5568" }}>
            <li style={{ marginBottom: 8 }}>
              Ouvrez le menu <strong>⋮</strong> (Chrome) ou <strong>⋯</strong> (Edge) en haut à droite.
            </li>
            <li style={{ marginBottom: 8 }}>
              Choisissez <strong>« Installer l'application »</strong> ou <strong>« Installer le site comme application »</strong>.
            </li>
            <li>
              Confirmez — une fenêtre dédiée s'ouvre et l'icône est ajoutée à votre bureau / barre des tâches.
            </li>
          </ol>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: "#4a5568" }}>
            <li style={{ marginBottom: 8 }}>
              Ouvrez le menu <strong>⋮</strong> en haut à droite de Chrome.
            </li>
            <li style={{ marginBottom: 8 }}>
              Choisissez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
            </li>
            <li>
              Confirmez — l'icône de l'app apparaît sur votre écran d'accueil.
            </li>
          </ol>
        )}

        <button
          onClick={onClose}
          style={{ marginTop: 20, width: "100%", height: 42, borderRadius: 10, border: "none", background: "#0A347B", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif" }}
        >
          J'ai compris
        </button>
      </div>
    </div>
  );
}