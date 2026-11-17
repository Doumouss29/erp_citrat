import React, { useState } from "react";
import { Smartphone, X, Share, Monitor, Plus } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

/**
 * Bouton "Installer l'application" pour le portail.
 * - Android/Chrome : déclenche la fenêtre d'installation native (beforeinstallprompt).
 * - iOS : ouvre une fenêtre d'instructions (Partager → Sur l'écran d'accueil).
 * - Desktop : ouvre une fenêtre d'instructions (Ajouter à l'écran d'accueil / raccourci).
 * - Masqué si l'app est déjà installée (mode standalone).
 * S'affiche systématiquement tant que l'app n'est pas installée.
 */
export default function PwaInstallButton({ darkMode: _darkMode = false }) {
  const { canInstall, isIOS, isDesktop, hasPrompt, install } = usePwaInstall();
  const [showModal, setShowModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!canInstall) return null;

  const handleClick = async () => {
    if (hasPrompt) {
      setInstalling(true);
      await install();
      setInstalling(false);
      return;
    }
    setShowModal(true);
  };

  const isDesktopFlow = isDesktop && !hasPrompt;

  return (
    <>
      <button
        onClick={handleClick}
        disabled={installing}
        className="cgesn-header-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 40,
          padding: "0 18px",
          borderRadius: 100,
          border: "1.5px solid rgba(255,255,255,0.35)",
          background: "rgba(255,255,255,0.12)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: installing ? "wait" : "pointer",
          fontFamily: "'Poppins',sans-serif",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        <Smartphone size={16} />
        {installing ? "Installation…" : "Installer l'application"}
      </button>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 380,
              width: "100%",
              padding: 28,
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              fontFamily: "'Poppins',Helvetica,Arial,sans-serif",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#0C3D85,#14806f)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isDesktopFlow ? <Monitor size={20} color="#fff" /> : <Smartphone size={20} color="#fff" />}
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#0a0a0a" }}>
                  {isDesktopFlow ? "Installer sur ordinateur" : "Installer sur iPhone"}
                </span>
              </div>
              <button onClick={() => setShowModal(false)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, color: "#737373" }} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>

            {isDesktopFlow ? (
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: "#404040" }}>
                <li style={{ marginBottom: 10 }}>
                  Cliquez sur l'icône <strong>Installer</strong>{" "}
                  <Plus size={14} style={{ display: "inline", verticalAlign: "middle", color: "#0C3D85" }} />
                  {" "}dans la barre d'adresse du navigateur (Chrome/Edge).
                </li>
                <li style={{ marginBottom: 10 }}>
                  Ou ouvrez le menu <strong>⋮</strong> (Chrome) / <strong>⋯</strong> (Edge) en haut à droite.
                </li>
                <li>
                  Choisissez <strong>« Installer l'application »</strong> ou <strong>« Installer le portail »</strong>.
                </li>
              </ol>
            ) : (
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: "#404040" }}>
                <li style={{ marginBottom: 10 }}>
                  Appuyez sur le bouton <strong>Partager</strong>{" "}
                  <Share size={15} style={{ display: "inline", verticalAlign: "middle", color: "#2563eb" }} />
                  {" "}en bas de l'écran dans Safari.
                </li>
                <li style={{ marginBottom: 10 }}>
                  Faites défiler et choisissez{" "}
                  <strong>« Sur l'écran d'accueil »</strong>.
                </li>
                <li>
                  Confirmez avec <strong>« Ajouter »</strong>. L'icône de l'app apparaît sur votre écran d'accueil.
                </li>
              </ol>
            )}

            <div style={{ marginTop: 20, padding: "12px 14px", background: "#f0fdf4", borderRadius: 10, fontSize: 12.5, color: "#166534", border: "1px solid #bbf7d0" }}>
              Astuce : l'application s'ouvre en plein écran, sans la barre du navigateur, comme une vraie app native.
            </div>

            <button
              onClick={() => setShowModal(false)}
              style={{
                marginTop: 20,
                width: "100%",
                height: 42,
                borderRadius: 100,
                border: "none",
                background: "#0C3D85",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Poppins',sans-serif",
              }}
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}