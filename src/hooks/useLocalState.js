import { useState, useEffect } from "react";

// État React synchronisé avec localStorage — survit aux actualisations.
export function useLocalState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initialValue;
      return JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota / mode privé : on ignore */
    }
  }, [key, value]);

  return [value, setValue];
}