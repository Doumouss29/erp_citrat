import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid oklch(0.88 0.005 90)",
  fontSize: 14,
  fontFamily: "'Poppins',sans-serif",
  outline: "none"
};
const labelStyle = { fontSize: 12, fontWeight: 600, color: "oklch(0.4 0.005 90)", display: "block", marginBottom: 6 };

// Icônes œil (SVG inline, pas de dépendance externe)
function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// Champ mot de passe avec bouton œil pour afficher/masquer
function PasswordField({ label, value, onChange, onKeyDown, placeholder, show, onToggle }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="cgesn-reg-input"
          style={{ ...inputStyle, paddingRight: 42 }}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "oklch(0.5 0.005 90)",
            cursor: "pointer"
          }}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

export default function Inscription() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(null);
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate("/portail", { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated]);

  useEffect(() => {
    base44.onboarding.config().then(c => setRegistrationEnabled(c.registration_enabled))
      .catch(() => setRegistrationEnabled(false));
  }, []);

  const submit = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Indiquez votre nom et prénom.");
      return;
    }
    if (!email.trim()) {
      setError("Indiquez votre e-mail.");
      return;
    }
    if (telephone.replace(/\D/g, "").length < 8 || telephone.length > 24) {
      setError("Indiquez un numéro de téléphone valide.");
      return;
    }
    if (password.length < 14) {
      setError("Le mot de passe doit contenir au moins 14 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    // Nom et prénom officiels gardés sur l'appareil : ils préremplissent le consentement
    // même si leur enregistrement sur le compte échoue après la vérification du code.
    try {
      localStorage.setItem("cgesn_signup_name", JSON.stringify({ email: email.trim().toLowerCase(), first_name: firstName.trim(), last_name: lastName.trim(), telephone: telephone.trim() }));
    } catch (e) { /* stockage indisponible */ }
    try {
      await base44.auth.register({ email: email.trim(), password, first_name: firstName.trim(), last_name: lastName.trim(), telephone: telephone.trim() });
      setOtpSent(true);
    } catch (err) {
      setError((err && err.message) || "Échec de la création du compte. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError(null);
    if (otp.trim().length < 6) {
      setError("Saisissez le code à 6 chiffres reçu par e-mail.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.verifyOtp({ email: email.trim(), otpCode: otp.trim() });
      setVerified(true);
    } catch (err) {
      setError((err && err.message) || "Code de vérification invalide.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await base44.auth.resendOtp(email.trim());
    } catch (err) {
      setError((err && err.message) || "Impossible de renvoyer le code.");
    }
  };

  return (
    <>
      <style>{`
        .cgesn-reg-btn:hover{background:#081F69 !important}
        @media (max-width:480px){
          .cgesn-reg-wrap{padding:14px !important}
          .cgesn-reg-card{padding:22px 18px !important;border-radius:16px !important}
          .cgesn-reg-head{gap:10px !important;margin-bottom:18px !important}
          .cgesn-reg-logo{width:180px !important;max-width:90% !important;height:auto !important;}
          .cgesn-reg-logo img{width:100% !important;height:auto !important}
          .cgesn-reg-title{font-size:16px !important}
          .cgesn-reg-form{gap:10px !important}
          .cgesn-reg-input{padding:10px 12px !important;font-size:13px !important}
          .cgesn-reg-btn{padding:11px !important;font-size:13px !important}
          .cgesn-reg-name-row{gap:8px !important}
        }
      `}</style>
      <div
        className="cgesn-reg-wrap"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(125deg,#061A58 0%,#0C3D85 58%,#087DA4 100%)",
          padding: 24,
          fontFamily: "'Poppins',Helvetica,Arial,sans-serif"
        }}
      >
        <div className="cgesn-reg-card" style={{ background: "#fff", borderRadius: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", padding: "clamp(32px,5vw,48px)", width: "100%", maxWidth: 400, boxSizing: "border-box" }}>
          <div className="cgesn-reg-head" style={{ marginBottom: 26, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
            <img src="/logo-citrat.svg" alt="Logo CITRAT" style={{ width: 196, maxWidth: "90%", height: "auto" }} />
            <div style={{ fontWeight: 800, fontSize: 17, color: "#081F69", letterSpacing: ".015em" }}>PORTAIL DIGITAL <span style={{ color: "#0A95C7" }}>CITRAT</span></div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#42536B" }}>DAGNOKO HAMED</div>
          </div>

          {!otpSent ? (
            <div className="cgesn-reg-form" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="cgesn-reg-name-row" style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                    placeholder="Prénom"
                    className="cgesn-reg-input"
                    style={{ ...inputStyle, textTransform: "uppercase" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                    placeholder="Nom"
                    className="cgesn-reg-input"
                    style={{ ...inputStyle, textTransform: "uppercase" }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                  placeholder="vous@citrat.ci"
                  className="cgesn-reg-input"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="signup-telephone">Numéro de téléphone *</label>
                <input
                  id="signup-telephone"
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                  placeholder="+225 07 00 00 00 00"
                  autoComplete="tel"
                  required
                  maxLength={24}
                  className="cgesn-reg-input"
                  style={inputStyle}
                />
              </div>
              <PasswordField
                label="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                placeholder="••••••••"
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />
              <PasswordField
                label="Confirmation de mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                placeholder="••••••••"
                show={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
              />
              <button
                onClick={submit}
                disabled={loading}
                className="cgesn-reg-btn"
                style={{ marginTop: 6, padding: 13, border: "none", borderRadius: 10, background: "#0C3D85", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "0.02em", cursor: loading ? "wait" : "pointer", fontFamily: "'Poppins',sans-serif", transition: "background .15s", opacity: loading ? 0.8 : 1 }}
              >
                {loading ? "CRÉATION…" : "CRÉER MON COMPTE"}
              </button>
              {error && (
                <div style={{ marginTop: 2, fontSize: "12.5px", fontWeight: 600, color: "oklch(0.45 0.18 25)", textAlign: "center" }}>
                  {error}
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: "12.5px", textAlign: "center" }}>
                <span style={{ color: "oklch(0.5 0.005 90)" }}>Déjà un compte ? </span>
                <Link to="/connexion" style={{ color: "#0C3D85", fontWeight: 700, textDecoration: "none" }}>Se connecter</Link>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "oklch(0.35 0.01 90)", textAlign: "center", lineHeight: 1.5 }}>
                Vérifiez votre e-mail.<br />Un code à 6 chiffres a été envoyé à {email.trim()}.
              </div>
              <div>
                <label style={labelStyle}>Code de vérification</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => { if (e.key === "Enter") verify(); }}
                  placeholder="••••••"
                  style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.4em", fontSize: 16 }}
                  autoFocus
                />
              </div>
              <button
                onClick={verify}
                disabled={loading}
                className="cgesn-reg-btn"
                style={{ marginTop: 6, padding: 13, border: "none", borderRadius: 10, background: "#0C3D85", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "0.02em", cursor: loading ? "wait" : "pointer", fontFamily: "'Poppins',sans-serif", transition: "background .15s", opacity: loading ? 0.8 : 1 }}
              >
                {loading ? "VÉRIFICATION…" : "VALIDER LE CODE"}
              </button>
              {error && (
                <div style={{ marginTop: 2, fontSize: "12.5px", fontWeight: 600, color: "oklch(0.45 0.18 25)", textAlign: "center" }}>
                  {error}
                </div>
              )}
              <div style={{ marginTop: 4, fontSize: "12.5px", textAlign: "center" }}>
                <span style={{ color: "oklch(0.5 0.005 90)" }}>Pas reçu le code ? </span>
                <button onClick={resend} style={{ background: "none", border: "none", color: "#0C3D85", fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: "12.5px", padding: 0 }}>Renvoyer</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
