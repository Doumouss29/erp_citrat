import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';

/**
 * Sélecteur de commune adapté au tactile.
 * - Téléphone : bouton carré (icône seule) ; tablette / ordinateur : bouton avec le nom.
 * - Liste compacte ancrée sous le bouton, lignes de 44 px (taille tactile minimale).
 */
export default function CommunePicker({ value, options = [], onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const choose = (c) => {
    onChange(c);
    setOpen(false);
  };

  const list = (
    <ul role="listbox" aria-label="Communes" className="py-1">
      {options.map((c) => {
        const selected = c === value;
        return (
          <li key={c}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => choose(c)}
              className={`w-full min-h-[44px] px-3 flex items-center gap-2.5 text-left text-sm touch-manipulation transition-colors ${
                selected ? 'bg-blue-50 text-blue-900 font-bold' : 'text-slate-700 font-medium hover:bg-slate-50 active:bg-slate-100'
              }`}
            >
              <MapPin className={`w-4 h-4 flex-shrink-0 ${selected ? 'text-blue-700' : 'text-slate-400'}`} />
              <span className="flex-1 truncate uppercase tracking-wide">{c}</span>
              {selected && <Check className="w-4 h-4 text-blue-700 flex-shrink-0" />}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Commune : ${value}`}
        className="h-12 min-w-[48px] flex items-center justify-center gap-2 rounded-xl bg-white text-blue-900 shadow-sm px-3 sm:pl-3 sm:pr-3 sm:min-w-[200px] sm:max-w-[42vw] touch-manipulation active:scale-95 transition focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        <MapPin className="w-6 h-6 sm:w-5 sm:h-5 text-blue-700 flex-shrink-0" />
        <span className="hidden sm:block flex-1 text-left font-bold text-base uppercase tracking-wide truncate">{value}</span>
        <ChevronDown className={`hidden sm:block w-5 h-5 text-blue-700 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        // Liste compacte ancrée juste sous le bouton (toutes tailles d'écran)
        <div className="absolute right-0 top-full mt-1.5 z-[2000] w-[200px] sm:w-full sm:min-w-[220px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="max-h-[50vh] overflow-y-auto overscroll-contain">{list}</div>
        </div>
      )}
    </div>
  );
}
