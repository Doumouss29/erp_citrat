import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useBrandLogos } from "@/lib/brandLogos";

export default function ForgotPassword() {
  const logos = useBrandLogos();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email.trim());
    } catch {
      // Toujours afficher un succès, peu importe le résultat
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <>
      <style>{`.cgesn-reset-btn:hover{background:#08245F !important}`}</style>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(120deg,#081F69 0%,#0C3D85 55%,#081F69 100%)",
          padding: 24,
          fontFamily: "'Poppins',Helvetica,Arial,sans-serif"
        }}
      >
        <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", padding: "clamp(32px,5vw,48px)", width: "100%", maxWidth: 400, boxSizing: "border-box" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center"}}>
              <img src={logos.login} alt="CITRAT" style={{ width: 82, height: 82, objectFit: "contain", display: "block" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.01em" }}>
                <span style={{ color: "oklch(0.62 0.13 55)" }}>PORTAIL DIGITAL</span>{" "}
                <span style={{ color: "oklch(0.22 0.01 90)" }}>CITRAT</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "oklch(0.55 0.005 90)", letterSpacing: "0.02em", marginTop: 4 }}>
                CABINET DE GÉOMÈTRE EXPERT SORO NANGA
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "oklch(0.22 0.01 90)" }}>Mot de passe oublié</div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "oklch(0.55 0.005 90)", marginTop: 6 }}>
              Saisissez votre e-mail, nous vous enverrons un lien pour le réinitialiser.
            </div>
          </div>

          {sent ? (
            <div style={{ textAlign: "center", fontSize: 13, fontWeight: 500, color: "oklch(0.4 0.005 90)", padding: "8px 0" }}>
              Si un compte existe avec cet e-mail, vous recevrez un lien de réinitialisation sous peu.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.4 0.005 90)", display: "block", marginBottom: 6 }}>E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@cgesn.com"
                  required
                  autoFocus
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: "1px solid oklch(0.88 0.005 90)", fontSize: 14, fontFamily: "'Poppins',sans-serif", outline: "none" }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="cgesn-reset-btn"
                style={{ marginTop: 6, padding: 13, border: "none", borderRadius: 10, background: "#0C3D85", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "0.02em", cursor: loading ? "wait" : "pointer", fontFamily: "'Poppins',sans-serif", transition: "background .15s", opacity: loading ? 0.8 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    ENVOI…
                  </>
                ) : (
                  "ENVOYER LE LIEN"
                )}
              </button>
            </form>
          )}

          <div style={{ marginTop: 22, textAlign: "center" }}>
            <Link to="/connexion" style={{ fontSize: 12.5, fontWeight: 700, color: "#0C3D85", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ArrowLeft size={14} /> Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}