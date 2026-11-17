import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Page qui regroupe plusieurs pages existantes derrière des boutons
// en haut (même style que la page Validation). L'onglet actif est gardé
// dans l'URL (?tab=...) pour pouvoir partager un lien direct.
// tabs: [{ key, label, icon: Icon, activeClass, render: () => <Page /> }]
export default function MergedTabsPage({ tabs }) {
  const location = useLocation();
  const navigate = useNavigate();
  const keys = tabs.map((t) => t.key);
  const fromUrl = () => {
    const t = new URLSearchParams(location.search).get("tab");
    return keys.includes(t) ? t : keys[0];
  };
  const [tab, setTab] = useState(fromUrl);

  useEffect(() => {
    const t = fromUrl();
    if (t !== tab) setTab(t);
     
  }, [location.search]);

  const selectTab = (key) => {
    setTab(key);
    navigate(`${location.pathname}?tab=${key}`, { replace: true });
  };

  const current = tabs.find((t) => t.key === tab) || tabs[0];

  return (
    <div className="min-h-screen bg-[#f1f6f7]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 lg:pt-8">
        {/* Sélecteur d'onglets aux couleurs RH-CITRAT (vert pétrole, actif doré) */}
        <div className="grid gap-1 p-1 rounded-2xl h-auto shadow-sm ring-1 ring-[#0d5c66]/10 bg-white" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map(({ key, label, icon: Icon, activeColor }) => (
            <button
              key={key}
              type="button"
              onClick={() => selectTab(key)}
              style={activeColor ? (tab === key ? { background: activeColor } : { color: activeColor }) : undefined}
              className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl font-semibold transition-all text-xs sm:text-sm ${
                tab === key ? "bg-[#0d5c66] text-white shadow-md" : "bg-transparent text-[#0d5c66]/70 hover:bg-[#0d5c66]/5 hover:text-[#0d5c66]"
              }`}
            >
              {Icon && <Icon className={`w-5 h-5 ${tab === key ? (activeColor ? "text-white" : "text-[#d4af6a]") : ""}`} />}
              {label}
            </button>
          ))}
        </div>
      </div>
      <div key={current.key}>{current.render()}</div>
    </div>
  );
}
