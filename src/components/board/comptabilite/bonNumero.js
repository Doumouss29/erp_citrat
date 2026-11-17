// Numérotation des bons de caisse : PREFIXE-BUREAU-AAAAMM-NNNN (ex. BS-YAKRO-202611-0002)
// La séquence est propre à chaque type (BE / BS), bureau et mois.

export function bonPrefixFor(type) {
  return type === 'entree' ? 'BE' : type === 'sortie' ? 'BS' : 'SD';
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function generateBonNumero(operations, type, date, bureauCode) {
  if (!bureauCode) return '';
  const dateObj = new Date(date || new Date());
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const base = `${bonPrefixFor(type)}-${bureauCode}-${year}${month}-`;
  const re = new RegExp(`^${escapeRegExp(base)}(\\d+)$`);

  const used = (operations || [])
    .map((op) => {
      const m = String(op?.numero_bon || '').trim().match(re);
      return m ? Number(m[1]) : null;
    })
    .filter((n) => n !== null && !Number.isNaN(n));

  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${base}${String(next).padStart(4, '0')}`;
}
