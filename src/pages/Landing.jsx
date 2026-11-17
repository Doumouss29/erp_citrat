import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// La page d'accueil est sautée : on redirige directement vers le portail
// si l'utilisateur est connecté, sinon vers la page de connexion brandée.
export default function Landing() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoadingAuth) return;
    navigate(isAuthenticated ? "/portail" : "/bienvenue", { replace: true });
  }, [isLoadingAuth, isAuthenticated]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(125deg,#061A58 0%,#0C3D85 58%,#087DA4 100%)", fontFamily: "'Poppins',Helvetica,Arial,sans-serif" }}>
      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
}