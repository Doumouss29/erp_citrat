import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useBrandLogos } from "@/lib/brandLogos";

export default function Connexion() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const logos = useBrandLogos();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate("/portail", { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated]);

  const login = async () => {
    setLoginError(null);
    setAuthLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      window.location.href = "/portail";
    } catch (err) {
      setLoginError((err && err.message) || "Échec de la connexion. Réessayez.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .cgesn-login-btn:hover{background:#08245f !important}
        @media (max-width:480px){
          .cgesn-login-logo{width:185px !important;height:70px !important}
          .cgesn-login-title{font-size:16px !important}
          .cgesn-login-sub{font-size:10px !important}
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center"}}>
              <img src={logos.login} alt="CITRAT" className="cgesn-login-logo" style={{ width: 200, height: 74, objectFit: "contain", display: "block" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="cgesn-login-title" style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.01em" }}>
                <span style={{ color: "#00A4D6" }}>PORTAIL DIGITAL</span>{" "}
                <span style={{ color: "#091F68" }}>CITRAT</span>
              </div>
              <div className="cgesn-login-sub" style={{ fontSize: 11, fontWeight: 500, color: "oklch(0.55 0.005 90)", letterSpacing: "0.02em", marginTop: 4 }}>
                DAGNOKO HAMED
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.4 0.005 90)", display: "block", marginBottom: 6 }}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") login(); }}
                placeholder="vous@citrat.ci"
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: "1px solid oklch(0.88 0.005 90)", fontSize: 14, fontFamily: "'Poppins',sans-serif", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.4 0.005 90)", display: "block", marginBottom: 6 }}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") login(); }}
                placeholder="••••••••"
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: "1px solid oklch(0.88 0.005 90)", fontSize: 14, fontFamily: "'Poppins',sans-serif", outline: "none" }}
              />
            </div>
            <button
              onClick={login}
              disabled={authLoading}
              className="cgesn-login-btn"
              style={{ marginTop: 6, padding: 13, border: "none", borderRadius: 10, background: "#0A347B", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "0.02em", cursor: authLoading ? "wait" : "pointer", fontFamily: "'Poppins',sans-serif", transition: "background .15s", opacity: authLoading ? 0.8 : 1 }}
            >
              {authLoading ? "CONNEXION…" : "SE CONNECTER"}
            </button>
            {loginError && (
              <div style={{ marginTop: 2, fontSize: "12.5px", fontWeight: 600, color: "oklch(0.45 0.18 25)", textAlign: "center" }}>
                {loginError}
              </div>
            )}
            <div style={{ marginTop: 6, fontSize: "12.5px", textAlign: "center", display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
              <Link to="/inscription" style={{ color: "#0A347B", fontWeight: 700, textDecoration: "none" }}>S'inscrire</Link>
              <span style={{ color: "oklch(0.8 0.005 90)" }}>|</span>
              <Link to="/forgot-password" style={{ color: "#0A347B", fontWeight: 700, textDecoration: "none" }}>Mot de passe oublié ?</Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}