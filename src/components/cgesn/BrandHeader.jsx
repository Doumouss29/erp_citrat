import React from "react";
import { Image } from "@/components/ui/image";
import { useBrandLogos } from "@/lib/brandLogos";
import BrandMobileMenu from "@/components/cgesn/BrandMobileMenu";

// En-tête de marque vert dégradé, reproduit à l'identique du design.
// Props : subtitle, maxWidth (1180 par défaut), nowrap, wrap, children (slot droite).
export default function BrandHeader({ subtitle, maxWidth = 1180, nowrap = false, wrap = false, className = "", mobileMenuItems, children, menuUser }) {
  const logos = useBrandLogos();
  return (
    <div
      className={className}
      style={{ background: "linear-gradient(120deg,#0d3b3f 0%,#0f5c52 60%,#0d3b3f 100%)", padding: "0 clamp(20px,4vw,56px)" }}>
      <style>{`
        .cgesn-brand-title,.cgesn-brand-sub{overflow:hidden;text-overflow:ellipsis;white-space:nowrap !important;max-width:100%}
        @media (max-width:1024px){
          .cgesn-brand-logo{width:80px !important;height:80px !important}
          .cgesn-brand-logo img{width:62px !important;height:62px !important}
          .cgesn-brand-title{font-size:23px !important}
        }
        .cgesn-brand-mobile-actions{display:none}
        @media (max-width:1023px){
          .cgesn-brand-row{padding-top:max(env(safe-area-inset-top, 0px), 12px) !important}
          /* Tablette : on garde les actions (avatar, Administration…) mais le titre cède la place */
          .cgesn-brand-logo{width:68px !important;height:68px !important}
          .cgesn-brand-title{font-size:20px !important}
          .cgesn-brand-sub{font-size:10.5px !important}
        }
        /* Téléphone uniquement : actions regroupées dans le menu latéral */
        @media (max-width:640px){
          .cgesn-brand-desktop-actions{display:none !important}
          .cgesn-brand-mobile-actions{display:block;flex:none}
        }
        /* Téléphone uniquement : la tablette (>= 641px) conserve le titre du portail */
        @media (max-width:640px){
          .cgesn-brand-row{flex-wrap:nowrap !important;gap:10px !important;padding:max(env(safe-area-inset-top, 0px), 12px) 0 16px !important;min-height:100px !important}
          .cgesn-brand-lockup{flex:1;gap:0 !important}
          .cgesn-brand-title,.cgesn-brand-sub{display:none !important}
          .cgesn-brand-logo{width:72px !important;height:72px !important}
          .cgesn-brand-logo img{width:100% !important;height:100% !important;object-fit:contain !important}
        }
      `}</style>
      <div
        className="cgesn-brand-row"
        style={{
          maxWidth,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "18px 0",
          flexWrap: wrap ? "wrap" : "nowrap"
        }}
      >
        <div className="cgesn-brand-lockup" style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
          <div
            className="cgesn-brand-logo"
            style={{
              width: 104,
              height: 104,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
              filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.25))"
            }}>
            <Image
              src={logos.header}
              alt="CGESN"
              fittingType="fit"
              className="block h-full w-full object-contain"
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="cgesn-brand-title" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.02em", lineHeight: 1.1, textShadow: "0 2px 8px rgba(0,0,0,0.18)" }}>
              <span style={{ color: "oklch(0.82 0.15 80)" }}>PORTAIL DIGITAL</span> <span style={{ color: "#fff" }}>CGESN</span>
            </div>
            <div
              className="cgesn-brand-sub"
              style={{
                fontSize: "11.5px",
                fontWeight: 600,
                color: "oklch(0.88 0.02 165)",
                letterSpacing: "0.06em",
                marginTop: 4,
                whiteSpace: nowrap ? "nowrap" : "normal"
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>
        <div className="cgesn-brand-desktop-actions" style={{ display: "contents" }}>{children}</div>
        <BrandMobileMenu items={mobileMenuItems} user={menuUser} />
      </div>
    </div>
  );
}