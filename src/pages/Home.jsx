import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Rediriger immédiatement vers la page Pointage
    navigate(createPageUrl("Pointage"));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Redirection...</p>
      </div>
    </div>
  );
}