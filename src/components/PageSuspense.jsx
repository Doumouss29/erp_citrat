import React, { Suspense } from "react";

// Zone de chargement d'une page chargée à la demande : le menu de l'application reste affiché
// pendant le téléchargement de la page, seul le contenu montre l'indicateur.
export default function PageSuspense({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
