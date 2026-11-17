import React from "react";
import { Link } from "react-router-dom";
import BrandHeader from "@/components/cgesn/BrandHeader";
import ColorBar from "@/components/cgesn/ColorBar";
import SiteFooter from "@/components/cgesn/SiteFooter";

export default function Conditions() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "oklch(0.965 0.004 90)", fontFamily: "'Poppins',Helvetica,Arial,sans-serif", overflowX: "hidden" }}>
      <BrandHeader subtitle="CABINET IVOIRIEN DES TRAVAUX TOPOGRAPHIQUES" nowrap maxWidth={820} />
      <ColorBar />

      <div style={{ flex: 1, maxWidth: 820, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: "clamp(36px,5vw,56px) clamp(20px,4vw,32px) 60px" }}>
        <Link to="/" style={{ fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-block", marginBottom: 24, color: "#0C3D85" }}>
          ← Retour à l'accueil
        </Link>

        <h1 style={{ fontSize: "clamp(24px,3vw,32px)", fontWeight: 800, color: "oklch(0.22 0.01 90)", margin: "0 0 8px" }}>
          Conditions d'utilisation
        </h1>
        <p style={{ fontSize: 13, color: "oklch(0.55 0.005 90)", margin: "0 0 32px" }}>Dernière mise à jour : 20 août 2026</p>

        <div style={{ background: "#fff", border: "1px solid oklch(0.91 0.005 90)", borderRadius: 16, padding: "clamp(24px,3vw,36px)", display: "flex", flexDirection: "column", gap: 26 }}>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>1. Champ d'application</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              Les présentes conditions régissent l'accès et l'utilisation du Portail Digital CITRAT, réservé aux
              collaborateurs du Cabinet Ivoirien des Travaux Topographiques (CITRAT). L'utilisation du Portail implique
              l'acceptation pleine et entière de ces conditions.
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>2. Accès au Portail</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              L'accès est réservé aux personnes autorisées, authentifiées via un compte professionnel. Tout accès non
              autorisé est strictement interdit.
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>3. Rôle du Portail</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              Le Portail agit comme un point d'accès centralisant des liens vers des applications internes distinctes.
              Il n'héberge pas lui-même les données métier de ces applications ; chacune reste régie par ses propres
              règles d'usage.
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>4. Usage responsable</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              L'utilisateur s'engage à utiliser le Portail conformément à son objet professionnel, à ne pas tenter de
              contourner les mécanismes d'authentification et à signaler toute anomalie de sécurité constatée.
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>5. Disponibilité</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              Le CITRAT s'efforce d'assurer la disponibilité du Portail mais ne garantit pas un accès continu et
              ininterrompu, notamment lors de maintenances planifiées.
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>6. Modification des conditions</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              Le CITRAT se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs seront
              informés de toute modification substantielle.
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>7. Contact</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              Pour toute question relative à ces conditions, contactez la direction des systèmes d'information du CITRAT.
            </p>
          </section>
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingTop: 24, marginTop: 26, borderTop: "1px solid oklch(0.9 0.005 90)" }}>
          <Link to="/politique" style={{ fontSize: "13.5px", fontWeight: 600, textDecoration: "none", color: "#0C3D85" }}>
            Politique de confidentialité
          </Link>
          <Link to="/" style={{ fontSize: "13.5px", fontWeight: 600, textDecoration: "none", color: "#0C3D85" }}>
            Accueil
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}