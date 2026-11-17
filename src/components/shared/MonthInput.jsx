import React from "react";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// Firefox et Safari sur ordinateur n'ont pas de sélecteur <input type="month"> : le champ y devient
// une simple zone de texte. On affiche alors deux listes, avec la même valeur « AAAA-MM ».
const monthSupported = (() => {
  if (typeof document === "undefined") return true;
  const input = document.createElement("input");
  input.setAttribute("type", "month");
  input.value = "not-a-month";
  return input.type === "month" && input.value === "";
})();

export default function MonthInput({ value, onChange, disabled, className, style }) {
  if (monthSupported) {
    return <input type="month" value={value ?? ""} onChange={onChange} disabled={disabled} className={className} style={style} />;
  }
  const [annee = "", mois = ""] = (value || "").split("-");
  const courante = new Date().getFullYear();
  const annees = [];
  for (let a = courante + 2; a >= courante - 10; a--) annees.push(String(a));
  if (annee && !annees.includes(annee)) annees.push(annee);

  const emit = (a, m) => onChange({ target: { value: `${a || courante}-${m || "01"}` } });
  const selectStyle = { ...style, flex: 1, minWidth: 0 };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <select aria-label="Mois" value={mois} disabled={disabled} onChange={(e) => emit(annee, e.target.value)} className={className} style={selectStyle}>
        {!mois && <option value="">Mois</option>}
        {MOIS.map((nom, i) => <option key={nom} value={String(i + 1).padStart(2, "0")}>{nom}</option>)}
      </select>
      <select aria-label="Année" value={annee} disabled={disabled} onChange={(e) => emit(e.target.value, mois)} className={className} style={selectStyle}>
        {!annee && <option value="">Année</option>}
        {annees.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
}
