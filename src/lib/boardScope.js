// Périmètre CGESN-Board : chaque bureau ne voit que ses propres activités.
// Seuls la Direction (fonction « admin ») et le super administrateur voient tous les bureaux.

export const isBoardDirection = (u) =>
  !!u && (u.super_admin === true || u.fonction === 'admin' || u.data?.fonction === 'admin');

// Bureaux auxquels l'utilisateur est rattaché (bureau principal + bureaux secondaires)
export const userBureauIds = (u) => {
  if (!u) return [];
  const ids = [
    ...(Array.isArray(u.bureau_ids) ? u.bureau_ids : []),
    ...(Array.isArray(u.data?.bureau_ids) ? u.data.bureau_ids : []),
    u.bureau_id,
    u.data?.bureau_id,
  ].filter(Boolean);
  return Array.from(new Set(ids));
};

// Ne garde que les éléments (dossiers, opérations…) des bureaux de l'utilisateur
export const scopeToUserBureaux = (items, u, key = 'bureau_id') => {
  const list = Array.isArray(items) ? items : [];
  if (isBoardDirection(u)) return list;
  const ids = userBureauIds(u);
  return list.filter((x) => x && ids.includes(x[key]));
};

// Bureaux visibles par l'utilisateur
export const visibleBureaux = (bureaux, u) => {
  const list = Array.isArray(bureaux) ? bureaux : [];
  if (isBoardDirection(u)) return list;
  const ids = userBureauIds(u);
  return list.filter((b) => ids.includes(b.id));
};

export const canSeeBureau = (u, bureauId) => isBoardDirection(u) || userBureauIds(u).includes(bureauId);
