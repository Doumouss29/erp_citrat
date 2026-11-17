import { FormSelect } from "@/components/ui/form-select";
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ROLES } from '@/lib/engine';
import { Btn } from '@/components/coprociv/ui';

// Réservé à l'administrateur : attribue un profil métier à chaque compte.
export default function ProfilsModal({ onClose }) {
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    base44.entities.User.list().then(setUsers, () => setErr('Impossible de charger la liste des utilisateurs.'));
  }, []);

  const save = async (u, profil) => {
    setBusy(u.id); setErr('');
    try {
      await base44.entities.User.update(u.id, { copro_profil: profil || null });
      setUsers(list => list.map(x => x.id === u.id ? { ...x, profil } : x));
    } catch (e) { setErr('Modification refusée pour ' + (u.full_name || u.email) + '.'); }
    setBusy(null);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,29,61,.45)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#FFFDF8', color: 'oklch(0.24 0.020 var(--h))', borderRadius: 14, padding: 24, width: 'min(560px, 100%)', maxHeight: '85vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--b0)' }}>Profils des utilisateurs</div>
        <div style={{ fontSize: 14, color: 'oklch(0.5 0.020 var(--h))' }}>
          Chaque intervenant ne voit et ne modifie que ce qui relève de son métier. Pour ajouter quelqu’un, accordez-lui l’accès à COPROCIV depuis l’administration du portail, puis attribuez-lui son profil ici.
        </div>
        {err && <div style={{ fontSize: 14, color: 'oklch(0.5 0.15 25)' }}>{err}</div>}
        {!users ? <div style={{ fontSize: 14 }}>Chargement…</div> : users.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid oklch(0.93 0.012 85)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{u.full_name || u.email}{u.role === 'admin' && <span style={{ fontSize: 12, marginLeft: 6, color: 'oklch(0.5 0.020 var(--h))' }}>(administrateur)</span>}</div>
              <div style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))' }}>{u.email}</div>
            </div>
            <FormSelect value={u.copro_profil || ''} disabled={busy === u.id} onChange={e => save(u, e.target.value)} style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid oklch(0.88 0.012 85)', background: 'white', fontSize: 14 }}>
              <option value="">— Lecture seule —</option>
              {ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </FormSelect>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Btn onClick={onClose}>Fermer</Btn></div>
      </div>
    </div>
  );
}
