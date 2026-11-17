import React from "react";
import { Link } from "react-router-dom";
import BrandHeader from "@/components/cgesn/BrandHeader";
import ColorBar from "@/components/cgesn/ColorBar";
import SiteFooter from "@/components/cgesn/SiteFooter";
import { LEGAL_FRAMEWORK } from "@/lib/consentement";

export default function Politique() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "oklch(0.965 0.004 90)", fontFamily: "'Poppins',Helvetica,Arial,sans-serif", overflowX: "hidden" }}>
      <BrandHeader subtitle="DAGNOKO HAMED" nowrap maxWidth={820} />
      <ColorBar />

      <div style={{ flex: 1, maxWidth: 820, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: "clamp(36px,5vw,56px) clamp(20px,4vw,32px) 60px" }}>
        <Link to="/" style={{ fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-block", marginBottom: 24, color: "#0C3D85" }}>
          ← Retour à l'accueil
        </Link>

        <h1 style={{ fontSize: "clamp(24px,3vw,32px)", fontWeight: 800, color: "oklch(0.22 0.01 90)", margin: "0 0 8px" }}>
          Politique de confidentialité
        </h1>
        <p style={{ fontSize: 13, color: "oklch(0.55 0.005 90)", margin: "0 0 32px" }}>Dernière mise à jour : 25 octobre 2026</p>

        <div style={{ background: "#fff", border: "1px solid oklch(0.91 0.005 90)", borderRadius: 16, padding: "clamp(24px,3vw,36px)", display: "flex", flexDirection: "column", gap: 26 }}>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>1. Objet</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              Le Portail Digital CITRAT ("le Portail") est un point d'accès interne mis à disposition par le Cabinet de
              Géomètre Expert Soro Nanga (CITRAT) pour ses collaborateurs. Cette politique décrit les
              données traitées lors de l'utilisation du Portail.
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>2. Données collectées</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              Le Portail traite les données suivantes : nom, prénom, date de naissance (pour calculer l'âge),
              numéro de téléphone et adresse e‑mail. Elles sont confirmées par chaque collaborateur lors de son
              premier accès, après lecture d'une notice d'information et recueil de son accord. Aucune donnée
              personnelle sensible n'est collectée.
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>3. Utilisation des données</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              Ces données servent à identifier l'utilisateur, à lui donner accès aux applications internes, à le
              contacter dans le cadre professionnel et à la gestion administrative et RH interne. Elles sont
              accessibles au service RH, à la direction et aux administrateurs du Portail. Elles ne sont ni
              vendues, ni partagées avec des tiers à des fins commerciales. Le traitement est réalisé conformément
              à la {LEGAL_FRAMEWORK.charAt(0).toLowerCase() + LEGAL_FRAMEWORK.slice(1)}
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>4. Partage avec des applications tierces</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              Le Portail redirige vers des applications distinctes (RH-CITRAT, CITRAT-Board, E-Cadastre, E-Guide etc.), chacune opérée sous sa propre politique de
              confidentialité. Le Portail ne transmet à ces applications que les informations strictement nécessaires
              à la continuité de session.
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>5. Conservation et sécurité</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              Les données sont conservées pendant toute la durée de la collaboration avec le CITRAT, puis pendant la
              durée d'archivage prévue par la loi, et protégées par des mesures techniques appropriées. Chaque accord
              donné ou retiré est horodaté et conservé comme preuve. Le CITRAT met en œuvre des contrôles d'accès limitant l'usage du Portail
              aux seuls collaborateurs autorisés.
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>6. Droits des utilisateurs</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              Tout collaborateur peut consulter, corriger ses données ou retirer son accord depuis la page
              « Mes données personnelles » du Portail (le retrait bloque l'accès au Portail). Les demandes de
              suppression sont traitées par la direction des systèmes d'information du CITRAT.
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.28 0.01 90)", margin: "0 0 8px" }}>7. Contact</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.4 0.005 90)", margin: 0 }}>
              Pour toute question relative à cette politique, contactez la direction des systèmes d'information du CITRAT.
            </p>
          </section>
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingTop: 24, marginTop: 26, borderTop: "1px solid oklch(0.9 0.005 90)" }}>
          <Link to="/conditions" style={{ fontSize: "13.5px", fontWeight: 600, textDecoration: "none", color: "#0C3D85" }}>
            Conditions d'utilisation
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