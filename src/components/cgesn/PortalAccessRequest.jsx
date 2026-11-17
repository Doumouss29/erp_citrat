import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

const LABELS = { en_attente: "En attente de validation administrative", valide: "Compte validé — applications attribuées par l’administration", suspendu: "Accès suspendu" };

export default function PortalAccessRequest({ userId, darkMode, refreshUser }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await base44.functions.invoke("requestPortalAccess", { action: "status" });
        if (alive) { setRequest(res.data); setError(""); }
      } catch {
        if (alive) setError("Impossible de vérifier votre demande. Réessayez.");
      } finally { if (alive) setLoading(false); }
    };
    setLoading(true);
    setRequest(null);
    setSubmitted(false);
    load();
    window.addEventListener("focus", load);
    return () => { alive = false; window.removeEventListener("focus", load); };
  }, [userId]);

  const submit = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("requestPortalAccess", { action: "submit" });
      setRequest(res.data);
      setSubmitted(res.data.status === "en_attente");
      if (refreshUser) await refreshUser();
    } catch {
      setError("Votre demande n’a pas pu être confirmée. Réessayez : aucune demande en double ne sera créée.");
    } finally { busy.current = false; setLoading(false); }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div role="status" aria-live="polite">
        {loading && "Vérification en cours…"}
        {!loading && request?.status && request.status !== "aucune" && (
          <>
            <p style={{ margin: "0 0 8px", fontWeight: 600 }}>{LABELS[request.status] || request.status}</p>
            {(submitted || request.status === "en_attente") && <p>Votre demande a été transmise à l’administration. Veuillez attendre sa validation.</p>}
            {request.date && <p>Demande enregistrée le {new Date(request.date).toLocaleString("fr-FR")}</p>}
          </>
        )}
      </div>
      {error && <p role="alert" style={{ color: darkMode ? "#fca5a5" : "#b91c1c" }}>{error}</p>}
      {(!request || request.status === "aucune") && (
        <button type="button" onClick={submit} disabled={loading}
          style={{ marginTop: 8, border: 0, borderRadius: 100, padding: "13px 24px", background: "#0C3D85", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.65 : 1 }}>
          {loading ? "VÉRIFICATION…" : "DEMANDER UN ACCÈS"}
        </button>
      )}
    </div>
  );
}
